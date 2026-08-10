import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { AnalyticsService } from '../services/analyticsService';
import { AIService } from '../services/aiService';

const analyticsRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.addHook('preValidation', (server as unknown as { authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }).authenticate);

  // 1. Overview Analytics
  server.get('/overview', async (request) => {
    const user = request.user as { salonId: string };
    const overview = await AnalyticsService.getOverview(user.salonId);
    return { success: true, data: overview };
  });

  // 2. Churn / Retention Analytics
  server.get('/churn', async (request) => {
    const user = request.user as { salonId: string };
    const highRisk = await AnalyticsService.getChurnRisk(user.salonId);
    return { success: true, data: highRisk };
  });

  // 3. Staff Performance / Occupancy
  server.get('/staff', async (request) => {
    const user = request.user as { salonId: string };
    const performance = await AnalyticsService.getStaffPerformance(user.salonId);
    return { success: true, data: performance };
  });

  // 4. AI Daily Briefing
  server.get('/briefing', async (request) => {
    const user = request.user as { salonId: string; name?: string };
    const userName = user.name || 'Owner';
    const briefing = await AIService.generateDailyBriefing(user.salonId, userName);
    return { success: true, data: briefing };
  });

};

export default analyticsRoutes;
