import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { AnalyticsService } from '../services/analyticsService';

const analyticsRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.addHook('preValidation', (server as any).authenticate);

  // 1. Overview Analytics
  server.get('/overview', async (request: any, reply) => {
    const salonId = request.user.salonId;
    const overview = await AnalyticsService.getOverview(salonId);
    return { success: true, data: overview };
  });

  // 2. Churn / Retention Analytics
  server.get('/churn', async (request: any, reply) => {
    const salonId = request.user.salonId;
    const highRisk = await AnalyticsService.getChurnRisk(salonId);
    return { success: true, data: highRisk };
  });

  // 3. Staff Performance / Occupancy
  server.get('/staff', async (request: any, reply) => {
    const salonId = request.user.salonId;
    const performance = await AnalyticsService.getStaffPerformance(salonId);
    return { success: true, data: performance };
  });

  // 4. AI Daily Briefing
  server.get('/briefing', async (request: any, reply) => {
    const salonId = request.user.salonId;
    const userName = request.user.name || 'Owner';
    const AIService = require('../services/aiService').AIService;
    const briefing = await AIService.generateDailyBriefing(salonId, userName);
    return { success: true, data: briefing };
  });

};

export default analyticsRoutes;

