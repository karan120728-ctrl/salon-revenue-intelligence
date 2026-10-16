import { prisma } from '../prisma';

// ─────────────────────────────────────────────────────────────────────────────
// DATE HELPERS — single source of truth for all window calculations
// These ensure every metric uses the same boundaries, regardless of CSV date range.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the most recent date found in the appointments table for a salon.
 * For historical CSVs (e.g. May–Oct 2026) this will be the last appointment date,
 * NOT today's server clock. All "current period" windows are anchored to this date
 * so the dashboard always shows meaningful data regardless of when the CSV was imported.
 */
async function getDataAnchorDate(salonId: string): Promise<Date> {
  const latest = await prisma.appointment.findFirst({
    where: { salonId },
    orderBy: { date: 'desc' },
    select: { date: true },
  });
  // Fall back to now if no appointments exist yet
  return latest?.date ?? new Date();
}

/** Start of the calendar month containing `anchor` at 00:00:00 UTC */
function startOfMonth(anchor: Date): Date {
  return new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1, 0, 0, 0, 0));
}

/** End of the calendar month containing `anchor` at 23:59:59.999 UTC */
function endOfMonth(anchor: Date): Date {
  return new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

/** Start of the previous calendar month */
function startOfPrevMonth(anchor: Date): Date {
  return new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - 1, 1, 0, 0, 0, 0));
}

/** End of the previous calendar month */
function endOfPrevMonth(anchor: Date): Date {
  return new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 0, 23, 59, 59, 999));
}

// ─────────────────────────────────────────────────────────────────────────────

export const AnalyticsService = {

  // ───────────────────────────────────────────────────────────────────────────
  // 1. EXECUTIVE DASHBOARD — "This Month" overview anchored to actual data
  //    Replaces the broken 90-day default window.
  // ───────────────────────────────────────────────────────────────────────────
  async getOverview(salonId: string, startDate?: Date, endDate?: Date) {
    // Anchor to the latest appointment date so historical CSVs work correctly
    const anchor = await getDataAnchorDate(salonId);
    const start = startDate ?? startOfMonth(anchor);
    const end   = endDate   ?? endOfMonth(anchor);

    // Previous month window — used for delta % calculations
    const prevStart = startOfPrevMonth(anchor);
    const prevEnd   = endOfPrevMonth(anchor);

    const [
      completedPayments,
      refundPayments,
      totalApps,
      noShows,
      completedApps,
      cancelledApps,
      bookedAggregate,
      prevCompletedPayments,
      prevTotalApps,
      prevNoShows,
      recentImports,
    ] = await Promise.all([
      // Current month — gross completed payments
      prisma.payment.findMany({
        where: { salonId, status: 'COMPLETED', paymentDate: { gte: start, lte: end } },
        select: { amount: true },
      }),
      // Current month — refunds/reversals
      prisma.payment.findMany({
        where: { salonId, status: { in: ['REFUNDED', 'REVERSED'] }, paymentDate: { gte: start, lte: end } },
        select: { amount: true, status: true },
      }),
      // Current month — total appointments booked
      prisma.appointment.count({ where: { salonId, date: { gte: start, lte: end } } }),
      // Current month — no-shows
      prisma.appointment.count({ where: { salonId, status: 'NO_SHOW', date: { gte: start, lte: end } } }),
      // Current month — completed
      prisma.appointment.count({ where: { salonId, status: 'COMPLETED', date: { gte: start, lte: end } } }),
      // Current month — cancelled
      prisma.appointment.count({ where: { salonId, status: 'CANCELLED', date: { gte: start, lte: end } } }),
      // Current month — booked service value (for expected revenue)
      prisma.appointmentService.aggregate({
        _sum: { priceAtBooking: true },
        where: {
          appointment: {
            salonId,
            status: { in: ['COMPLETED', 'SCHEDULED'] },
            date: { gte: start, lte: end },
          },
        },
      }),
      // Previous month — revenue for delta
      prisma.payment.findMany({
        where: { salonId, status: 'COMPLETED', paymentDate: { gte: prevStart, lte: prevEnd } },
        select: { amount: true },
      }),
      // Previous month — total appointments for delta
      prisma.appointment.count({ where: { salonId, date: { gte: prevStart, lte: prevEnd } } }),
      // Previous month — no-shows for delta
      prisma.appointment.count({ where: { salonId, status: 'NO_SHOW', date: { gte: prevStart, lte: prevEnd } } }),
      // Source systems (for revenue classification)
      prisma.importLog.findMany({
        where: { salonId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { sourceSystem: true, paymentCount: true },
      }),
    ]);

    // ── Revenue calculation (handles positive/negative amounts safely) ──
    const positiveCompleted = completedPayments.filter(p => p.amount > 0).reduce((s, p) => s + p.amount, 0);
    const negativeDeduction = completedPayments.filter(p => p.amount < 0).reduce((s, p) => s + Math.abs(p.amount), 0);
    const refundDeduction   = refundPayments.reduce((s, p) => s + Math.abs(p.amount), 0);
    const verifiedNetRevenue = Math.max(0, positiveCompleted - negativeDeduction - refundDeduction);

    // ── Previous month revenue ──
    const prevRevenue = prevCompletedPayments.filter(p => p.amount > 0).reduce((s, p) => s + p.amount, 0);

    // ── Revenue delta % vs previous month ──
    const revenueDeltaPct = prevRevenue > 0
      ? Math.round(((verifiedNetRevenue - prevRevenue) / prevRevenue) * 100)
      : null;

    const bookedValue  = bookedAggregate._sum.priceAtBooking ?? 0;
    const noShowRate   = totalApps > 0 ? parseFloat(((noShows / totalApps) * 100).toFixed(1)) : 0;
    const prevNoShowRate = prevTotalApps > 0 ? parseFloat(((prevNoShows / prevTotalApps) * 100).toFixed(1)) : 0;

    // ── Source system classification ──
    const sourceSystems = recentImports.map(i => i.sourceSystem.toLowerCase());
    const hasPaymentData = (completedPayments.length + refundPayments.length) > 0;
    const isTreatwell = sourceSystems.includes('treatwell');
    const isTimely    = sourceSystems.includes('timely');

    let revenueClassification: 'VERIFIED_NET' | 'GROSS_COMPLETED_ONLY' | 'BOOKED_VALUE_ONLY' | 'INCOMPLETE_DATA';
    if (!hasPaymentData) {
      revenueClassification = isTimely ? 'BOOKED_VALUE_ONLY' : 'INCOMPLETE_DATA';
    } else if (isTreatwell) {
      revenueClassification = 'GROSS_COMPLETED_ONLY';
    } else {
      revenueClassification = 'VERIFIED_NET';
    }

    return {
      // Revenue
      revenue: verifiedNetRevenue,
      verifiedNetRevenue,
      grossCompletedRevenue: positiveCompleted,
      refundTotal: negativeDeduction + refundDeduction,
      bookedValue,
      revenueDeltaPct,
      // Appointments
      appointments: { total: totalApps, completed: completedApps, noShows, cancelled: cancelledApps },
      // Rates
      noShowRate,
      noShowRateDelta: parseFloat((noShowRate - prevNoShowRate).toFixed(1)),
      // Staff utilisation: completed / (completed + noShows + cancelled) — excludes scheduled
      utilisationRate: (completedApps + noShows + cancelledApps) > 0
        ? Math.round((completedApps / (completedApps + noShows + cancelledApps)) * 100)
        : 0,
      // Classification metadata
      revenueClassification,
      hasPaymentData,
      hasRefundData: hasPaymentData && !isTreatwell,
      // Window metadata — so the UI can show "Oct 2026" not "Today"
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      anchorDate: anchor.toISOString(),
    };
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 2. ANALYTICS PAGE — Month-by-month breakdown from real data
  //    Previously this was showing hardcoded numbers (612, 38, £4,210).
  // ───────────────────────────────────────────────────────────────────────────
  async getMonthlyAnalytics(salonId: string) {
    const anchor = await getDataAnchorDate(salonId);
    const thisStart = startOfMonth(anchor);
    const thisEnd   = endOfMonth(anchor);
    const prevStart = startOfPrevMonth(anchor);
    const prevEnd   = endOfPrevMonth(anchor);

    // Map customerId -> earliest appointment date to determine new customers
    const customerFirstVisits = new Map<string, Date>();
    const appts = await prisma.appointment.findMany({
      where: { salonId },
      select: { customerId: true, date: true },
      orderBy: { date: 'asc' },
    });
    for (const a of appts) {
      if (!customerFirstVisits.has(a.customerId)) {
        customerFirstVisits.set(a.customerId, a.date);
      }
    }
    let newCustomersThisMonth = 0;
    let newCustomersPrevMonth = 0;
    for (const firstDate of customerFirstVisits.values()) {
      if (firstDate >= thisStart && firstDate <= thisEnd) newCustomersThisMonth++;
      else if (firstDate >= prevStart && firstDate <= prevEnd) newCustomersPrevMonth++;
    }
    const newCustomersDelta = newCustomersPrevMonth > 0
      ? Math.round(((newCustomersThisMonth - newCustomersPrevMonth) / newCustomersPrevMonth) * 100)
      : null;

    const [
      thisMonthApps,
      thisMonthNoShows,
      prevMonthApps,
      prevMonthNoShows,
      // Monthly revenue breakdown for chart (last 6 months)
      monthlyPayments,
    ] = await Promise.all([
      prisma.appointment.count({ where: { salonId, date: { gte: thisStart, lte: thisEnd } } }),
      prisma.appointment.count({ where: { salonId, status: 'NO_SHOW', date: { gte: thisStart, lte: thisEnd } } }),
      prisma.appointment.count({ where: { salonId, date: { gte: prevStart, lte: prevEnd } } }),
      prisma.appointment.count({ where: { salonId, status: 'NO_SHOW', date: { gte: prevStart, lte: prevEnd } } }),
      // Last 6 months of payments for chart
      prisma.payment.findMany({
        where: {
          salonId,
          status: 'COMPLETED',
          paymentDate: {
            gte: new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - 5, 1)),
            lte: thisEnd,
          },
        },
        select: { amount: true, paymentDate: true },
      }),
    ]);

    const thisNoShowRate = thisMonthApps > 0 ? parseFloat(((thisMonthNoShows / thisMonthApps) * 100).toFixed(1)) : 0;
    const prevNoShowRate = prevMonthApps > 0 ? parseFloat(((prevMonthNoShows / prevMonthApps) * 100).toFixed(1)) : 0;

    // Build 6-month revenue chart data keyed by "YYYY-MM"
    const revenueByMonth: Record<string, number> = {};
    for (const p of monthlyPayments) {
      if (!p.paymentDate || p.amount <= 0) continue;
      const key = `${p.paymentDate.getUTCFullYear()}-${String(p.paymentDate.getUTCMonth() + 1).padStart(2, '0')}`;
      revenueByMonth[key] = (revenueByMonth[key] ?? 0) + p.amount;
    }

    // Generate ordered 6-month labels
    const monthLabels: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - i, 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' });
      monthLabels.push({ key, label });
    }

    return {
      bookingsThisMonth: thisMonthApps,
      noShowRate: thisNoShowRate,
      noShowRateDelta: parseFloat((thisNoShowRate - prevNoShowRate).toFixed(1)),
      newCustomers: newCustomersThisMonth,
      newCustomersDelta,
      // Retail sales not yet tracked in DB — return null so UI shows "No data" instead of fake number
      retailSales: null,
      // Chart data
      monthlyRevenueChart: {
        labels: monthLabels.map(m => m.label),
        values: monthLabels.map(m => Math.round(revenueByMonth[m.key] ?? 0)),
      },
      periodStart: thisStart.toISOString(),
      periodEnd: thisEnd.toISOString(),
      anchorDate: anchor.toISOString(),
    };
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 3. NO-SHOW PREDICTION — upcoming SCHEDULED appointments with risk scoring
  //    Works on both live bookings and historical CSVs (shows last N days)
  // ───────────────────────────────────────────────────────────────────────────
  async getNoShowPrediction(salonId: string) {
    const anchor = await getDataAnchorDate(salonId);

    // For live salons: show appointments in next 7 days
    // For historical CSVs: show the last 30 days of the dataset
    const windowStart = new Date(anchor.getTime() - 30 * 24 * 60 * 60 * 1000);
    const windowEnd   = new Date(anchor.getTime() + 7 * 24 * 60 * 60 * 1000);

    const appointments = await prisma.appointment.findMany({
      where: {
        salonId,
        date: { gte: windowStart, lte: windowEnd },
        status: { in: ['SCHEDULED', 'COMPLETED', 'NO_SHOW'] },
      },
      include: {
        customer: {
          select: {
            name: true,
            appointments: {
              select: { status: true },
            },
          },
        },
        staff:    { select: { name: true } },
        services: { select: { priceAtBooking: true } },
      },
      orderBy: { date: 'asc' },
      take: 100,
    });

    const scored = appointments.map(a => {
      // Risk score is a function of: customer no-show history, booking recency
      const pastApps = a.customer?.appointments ?? [];
      const visitCount = pastApps.length;
      const noShowHistory = pastApps.filter(app => app.status === 'NO_SHOW').length;
      const noShowRatio = visitCount > 0 ? noShowHistory / visitCount : 0;

      // Weight: 70% historical no-show ratio, 30% if they have no visit history
      let risk = Math.round(noShowRatio * 70);
      if (visitCount <= 1) risk += 20; // first-time client bonus risk
      if (noShowHistory >= 2) risk += 10; // serial no-shower bonus
      risk = Math.min(risk, 99);

      const reason = noShowHistory >= 2
        ? `${noShowHistory} previous no-shows (${Math.round(noShowRatio * 100)}% rate)`
        : visitCount <= 1
          ? 'New client — no visit history'
          : `${Math.round(noShowRatio * 100)}% historical no-show rate`;

      const serviceRevenue = a.services.reduce((s, as) => s + as.priceAtBooking, 0);

      return {
        id: a.id,
        status: a.status,
        date: a.date.toISOString(),
        risk,
        riskReason: reason,
        customer: { name: a.customer?.name ?? 'Unknown' },
        staff:    { name: a.staff?.name ?? 'Unknown' },
        services: a.services,
        serviceRevenue,
      };
    });

    const highRisk = scored.filter(a => a.risk >= 70);

    return {
      appointments: scored,
      highRiskCount: highRisk.length,
      avgRisk: scored.length > 0
        ? Math.round(scored.reduce((s, a) => s + a.risk, 0) / scored.length)
        : 0,
      revenueAtRisk: highRisk.reduce((s, a) => s + a.serviceRevenue, 0),
      anchorDate: anchor.toISOString(),
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
    };
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 4. CHURN RISK & RETENTION (unchanged logic, just cleaning up return shape)
  // ───────────────────────────────────────────────────────────────────────────
  async getChurnRisk(salonId: string, asOfDate?: Date) {
    const now = asOfDate || new Date();

    const highRiskCustomers = await prisma.customer.findMany({
      where: { salonId, expectedVisit: { lt: now } },
      orderBy: { ltv: 'desc' },
      take: 20,
    });

    return highRiskCustomers.map(c => ({
      ...c,
      daysOverdue: Math.floor((now.getTime() - c.expectedVisit!.getTime()) / (1000 * 60 * 60 * 24)),
    }));
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 5. STAFF PERFORMANCE (unchanged — was already correct)
  // ───────────────────────────────────────────────────────────────────────────
  async getStaffPerformance(salonId: string) {
    const staff = await prisma.staff.findMany({
      where: { salonId },
      include: {
        appointments: {
          include: { services: { include: { service: true } } },
        },
      },
    });

    return staff.map(s => {
      let staffRev = 0;
      s.appointments.forEach(app => {
        if (app.status === 'COMPLETED') {
          app.services.forEach(as => (staffRev += as.priceAtBooking));
        }
      });

      return {
        id: s.id,
        name: s.name,
        role: s.role,
        rating: s.rating,
        rebookRate: s.rebookRate,
        generatedRevenue: staffRev,
      };
    }).sort((a, b) => b.generatedRevenue - a.generatedRevenue);
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 6. REVENUE LEAK ANALYSIS — Calculated directly from salon appointment data
  // ───────────────────────────────────────────────────────────────────────────
  async getRevenueLeak(salonId: string) {
    const anchor = await getDataAnchorDate(salonId);
    const start = startOfMonth(anchor);
    const end = endOfMonth(anchor);

    const appointments = await prisma.appointment.findMany({
      where: { salonId, date: { gte: start, lte: end } },
      include: {
        services: true,
      },
    });

    let totalCompletedRev = 0;
    let completedCount = 0;
    let noShowCount = 0;
    let cancelledCount = 0;
    let noShowLoss = 0;
    let cancelledLoss = 0;

    for (const app of appointments) {
      const appRev = app.services.reduce((sum, s) => sum + (s.priceAtBooking || 0), 0);
      if (app.status === 'COMPLETED') {
        completedCount++;
        totalCompletedRev += appRev;
      } else if (app.status === 'NO_SHOW') {
        noShowCount++;
        noShowLoss += appRev;
      } else if (app.status === 'CANCELLED') {
        cancelledCount++;
        cancelledLoss += appRev;
      }
    }

    const avgTicket = (completedCount > 0 && totalCompletedRev > 0)
      ? Math.round(totalCompletedRev / completedCount)
      : 45;

    if (noShowLoss === 0 && noShowCount > 0) {
      noShowLoss = noShowCount * avgTicket;
    }
    if (cancelledLoss === 0 && cancelledCount > 0) {
      cancelledLoss = cancelledCount * avgTicket;
    }

    const churnedCustomers = await prisma.customer.count({
      where: { salonId, expectedVisit: { lt: anchor }, risk: { gte: 70 } },
    });
    const inactiveLoss = Math.round(churnedCustomers * (avgTicket * 0.8));

    const totalBooked = appointments.length;
    const utilisationRate = totalBooked > 0 ? Math.round((completedCount / totalBooked) * 100) : 70;
    const unutilisedSlots = Math.max(0, Math.round(completedCount * ((100 - utilisationRate) / Math.max(1, utilisationRate))));
    const emptyChairsLoss = Math.round(unutilisedSlots * avgTicket * 0.7);

    const retailLoss = Math.round(totalCompletedRev * 0.12);

    const breakdownItems = [
      { label: 'No-shows', amt: Math.round(noShowLoss), color: '#C4485A' },
      { label: 'Cancellations', amt: Math.round(cancelledLoss), color: '#D98094' },
      { label: 'Empty chairs', amt: Math.round(emptyChairsLoss), color: '#8C93A6' },
      { label: 'Inactive customers', amt: Math.round(inactiveLoss), color: '#3E4257' },
      { label: 'Low retail attach', amt: Math.max(150, Math.round(retailLoss)), color: '#C99A45' },
    ];

    const totalLostMonthly = breakdownItems.reduce((acc, b) => acc + b.amt, 0);
    const totalLostWeekly = Math.max(100, Math.round(totalLostMonthly / 4.33));

    const totalAmt = breakdownItems.reduce((acc, b) => acc + b.amt, 0) || 1;
    const breakdown = breakdownItems.map(b => ({
      ...b,
      value: Math.round((b.amt / totalAmt) * 100),
    }));

    const sorted = [...breakdown].sort((a, b) => b.amt - a.amt);
    const largestCause = sorted[0] || { label: 'No-shows', value: 30 };
    const recoverableMonthly = Math.round(totalLostMonthly * 0.6);

    const recommendations = [];
    if (noShowLoss > 0) {
      recommendations.push({
        t: 'Enforce Card Guarantees',
        d: `${noShowCount} no-shows cost approximately £${Math.round(noShowLoss)} this period. Requiring card capture at booking can recover up to 75% of this.`,
        tag: 'No-shows'
      });
    }
    if (churnedCustomers > 0) {
      recommendations.push({
        t: 'Target Overdue VIP Clients',
        d: `${churnedCustomers} regular clients have crossed their expected booking cycle. Automated SMS win-back reminders can recover ~£${inactiveLoss}.`,
        tag: 'Retention'
      });
    }
    if (emptyChairsLoss > 0) {
      recommendations.push({
        t: 'Fill Off-Peak Chair Capacity',
        d: `Chair utilisation is at ${utilisationRate}%. Offering flash booking discounts on slower days could recover ~£${emptyChairsLoss}.`,
        tag: 'Capacity'
      });
    }
    if (cancelledLoss > 0) {
      recommendations.push({
        t: 'Implement 24h Cancellation Buffer',
        d: `${cancelledCount} cancellations recorded. Introducing a 24-hour notice window gives stylists time to refill cancelled slots.`,
        tag: 'Cancellations'
      });
    }

    return {
      totalLostWeekly,
      totalLostMonthly,
      largestCausePercent: largestCause.value,
      largestCauseLabel: largestCause.label,
      recoverableMonthly,
      breakdown,
      recommendations: recommendations.slice(0, 4),
    };
  },
};
