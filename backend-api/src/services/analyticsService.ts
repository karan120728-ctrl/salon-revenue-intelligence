import { prisma } from '../prisma';

export const AnalyticsService = {
  // 1. Get Core Overview Metrics (Optimized with Database Aggregations & Concurrent Execution)
  async getOverview(salonId: string, startDate?: Date, endDate?: Date) {
    const now = new Date();
    const start = startDate || new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // Default: last 90 days
    const end = endDate || now;

    // Run revenue aggregation, refunds, booked values, and appointment counts in parallel
    const [
      completedPayments,
      refundPayments,
      totalApps,
      noShows,
      completedApps,
      bookedAggregate,
      recentImports
    ] = await Promise.all([
      // Gross completed payments
      prisma.payment.findMany({
        where: {
          salonId,
          status: 'COMPLETED',
          paymentDate: { gte: start, lte: end }
        },
        select: { amount: true }
      }),
      // Explicit refunds and reversals
      prisma.payment.findMany({
        where: {
          salonId,
          status: { in: ['REFUNDED', 'REVERSED'] },
          paymentDate: { gte: start, lte: end }
        },
        select: { amount: true, status: true }
      }),
      prisma.appointment.count({
        where: { salonId, date: { gte: start, lte: end } }
      }),
      prisma.appointment.count({
        where: { salonId, status: 'NO_SHOW', date: { gte: start, lte: end } }
      }),
      prisma.appointment.count({
        where: { salonId, status: 'COMPLETED', date: { gte: start, lte: end } }
      }),
      // Booked appointment value from services
      prisma.appointmentService.aggregate({
        _sum: { priceAtBooking: true },
        where: {
          appointment: {
            salonId,
            status: { in: ['COMPLETED', 'SCHEDULED'] },
            date: { gte: start, lte: end }
          }
        }
      }),
      // Source systems recorded for this salon
      prisma.importLog.findMany({
        where: { salonId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { sourceSystem: true, paymentCount: true }
      })
    ]);

    // Handle amounts carefully to prevent double subtraction:
    // If a refund is stored as +92.50, we subtract 92.50.
    // If a refund is stored as -92.50, Math.abs(-92.50) is 92.50, preventing double negative addition.
    // If a completed payment was logged with negative amount, it is counted as a reduction, not double-added.
    const positiveCompleted = completedPayments
      .filter(p => p.amount > 0)
      .reduce((sum, p) => sum + p.amount, 0);

    const negativeCompletedDeduction = completedPayments
      .filter(p => p.amount < 0)
      .reduce((sum, p) => sum + Math.abs(p.amount), 0);

    const explicitRefundDeduction = refundPayments
      .reduce((sum, p) => sum + Math.abs(p.amount), 0);

    const totalRefundDeduction = explicitRefundDeduction + negativeCompletedDeduction;
    const verifiedNetRevenue = Math.max(0, positiveCompleted - totalRefundDeduction);
    const bookedValue = bookedAggregate._sum.priceAtBooking || 0;

    const hasPaymentData = (completedPayments.length + refundPayments.length) > 0;
    const sourceSystems = recentImports.map(i => i.sourceSystem.toLowerCase());
    const isTreatwell = sourceSystems.includes('treatwell');
    const isTimely = sourceSystems.includes('timely');

    let revenueClassification: 'VERIFIED_NET' | 'GROSS_COMPLETED_ONLY' | 'BOOKED_VALUE_ONLY' | 'INCOMPLETE_DATA';
    if (!hasPaymentData) {
      revenueClassification = isTimely ? 'BOOKED_VALUE_ONLY' : 'INCOMPLETE_DATA';
    } else if (isTreatwell) {
      revenueClassification = 'GROSS_COMPLETED_ONLY';
    } else {
      revenueClassification = 'VERIFIED_NET';
    }

    const noShowRate = totalApps > 0 ? (noShows / totalApps) * 100 : 0;

    return {
      revenue: verifiedNetRevenue, // Backward-compatible primary revenue metric
      verifiedNetRevenue,
      grossCompletedRevenue: positiveCompleted,
      refundTotal: totalRefundDeduction,
      bookedValue,
      revenueClassification,
      hasPaymentData,
      hasRefundData: hasPaymentData && !isTreatwell,
      appointments: {
        total: totalApps,
        completed: completedApps,
        noShows
      },
      noShowRate: parseFloat(noShowRate.toFixed(1))
    };
  },

  // 2. Churn Risk & Retention Calculation (Supports optional fixed asOf date for audits)
  async getChurnRisk(salonId: string, asOfDate?: Date) {
    const now = asOfDate || new Date();
    
    // Find customers whose expected return date has passed
    const highRiskCustomers = await prisma.customer.findMany({
      where: {
        salonId,
        expectedVisit: { lt: now } // They are overdue
      },
      orderBy: { ltv: 'desc' }, // Sort by highest lifetime value
      take: 20
    });

    return highRiskCustomers.map(c => ({
      ...c,
      daysOverdue: Math.floor((now.getTime() - c.expectedVisit!.getTime()) / (1000 * 60 * 60 * 24))
    }));
  },

  // 3. Staff Performance (Occupancy & Rebook Rate)
  async getStaffPerformance(salonId: string) {
    // Currently fetching raw staff. 
    // In a fully scaled system, we would calculate occupancy = (booked duration / available shift duration).
    const staff = await prisma.staff.findMany({
      where: { salonId },
      include: {
        appointments: {
          include: { services: { include: { service: true } } }
        }
      }
    });

    return staff.map(s => {
      // Basic revenue generation calculation per staff
      let staffRev = 0;
      s.appointments.forEach(app => {
        if (app.status === 'COMPLETED') {
          app.services.forEach(as => staffRev += as.priceAtBooking);
        }
      });

      return {
        id: s.id,
        name: s.name,
        role: s.role,
        rating: s.rating,
        rebookRate: s.rebookRate,
        generatedRevenue: staffRev
      };
    }).sort((a, b) => b.generatedRevenue - a.generatedRevenue); // Sort by highest revenue
  }
};
