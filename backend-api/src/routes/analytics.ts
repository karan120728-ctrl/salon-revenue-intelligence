import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { AnalyticsService } from '../services/analyticsService';
import { AIService } from '../services/aiService';

const analyticsRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.addHook('preValidation', (server as unknown as { authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }).authenticate);

  // 1. Executive Dashboard Overview (anchored to actual data, not server clock)
  server.get('/overview', async (request) => {
    const user = request.user as { salonId: string };
    const overview = await AnalyticsService.getOverview(user.salonId);
    return { success: true, data: overview };
  });

  // 2. Analytics Page — monthly KPIs + chart data (no more hardcoded numbers)
  server.get('/monthly', async (request) => {
    const user = request.user as { salonId: string };
    const monthly = await AnalyticsService.getMonthlyAnalytics(user.salonId);
    return { success: true, data: monthly };
  });

  // 3. No-show prediction — scored upcoming/recent appointments
  server.get('/noshow-prediction', async (request) => {
    const user = request.user as { salonId: string };
    const prediction = await AnalyticsService.getNoShowPrediction(user.salonId);
    return { success: true, data: prediction };
  });

  // 4. Churn / Retention Analytics
  server.get('/churn', async (request) => {
    const user = request.user as { salonId: string };
    const highRisk = await AnalyticsService.getChurnRisk(user.salonId);
    return { success: true, data: highRisk };
  });

  // 5. Staff Performance / Occupancy
  server.get('/staff', async (request) => {
    const user = request.user as { salonId: string };
    const performance = await AnalyticsService.getStaffPerformance(user.salonId);
    return { success: true, data: performance };
  });

  // 6. AI Daily Briefing
  server.get('/briefing', async (request) => {
    const user = request.user as { salonId: string; name?: string };
    const userName = user.name || 'Owner';
    const briefing = await AIService.generateDailyBriefing(user.salonId, userName);
    return { success: true, data: briefing };
  });
};

export default analyticsRoutes;
