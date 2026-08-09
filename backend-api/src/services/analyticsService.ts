import { prisma } from '../prisma';

export const AnalyticsService = {
  // 1. Get Core Overview Metrics
  async getOverview(salonId: string, startDate?: Date, endDate?: Date) {
    const now = new Date();
    const start = startDate || new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // Default: last 90 days
    const end = endDate || now;

    // Calculate Real Revenue (Sum of completed payments)
    const payments = await prisma.payment.findMany({
      where: {
        salonId,
        status: 'COMPLETED',
        paymentDate: { gte: start, lte: end }
      }
    });
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    // Calculate Appointment Stats & No-Show Rate
    const apps = await prisma.appointment.findMany({
      where: {
        salonId,
        date: { gte: start, lte: end }
      }
    });

    const totalApps = apps.length;
    const noShows = apps.filter(a => a.status === 'NO_SHOW').length;
    const completedApps = apps.filter(a => a.status === 'COMPLETED').length;
    const noShowRate = totalApps > 0 ? (noShows / totalApps) * 100 : 0;

    return {
      revenue: totalRevenue,
      appointments: {
        total: totalApps,
        completed: completedApps,
        noShows
      },
      noShowRate: parseFloat(noShowRate.toFixed(1))
    };
  },

  // 2. Churn Risk & Retention Calculation
  async getChurnRisk(salonId: string) {
    const now = new Date();
    
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
