import { FastifyInstance, FastifyPluginAsync } from 'fastify';

const aiRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  // All AI routes require authentication — salonId comes from the JWT, never from the request body
  server.addHook('preValidation', (server as any).authenticate);

  // POST /api/ai/advisor
  // Body: { query: string }
  // Returns: { success: true, answer: string }
  server.post('/advisor', async (request: any, reply) => {
    // ── Input validation ──────────────────────────────────────────────────────
    const { query } = request.body as { query?: unknown };

    if (!query || typeof query !== 'string') {
      return reply.status(400).send({
        success: false,
        error: 'query is required and must be a non-empty string.'
      });
    }

    const trimmed = query.trim();

    if (trimmed.length === 0) {
      return reply.status(400).send({
        success: false,
        error: 'query must not be empty.'
      });
    }

    if (trimmed.length > 500) {
      return reply.status(400).send({
        success: false,
        error: 'query is too long. Maximum 500 characters allowed.'
      });
    }

    // ── Security: always use server-side salonId from the verified JWT ────────
    // Any salonId passed in the body is completely ignored here.
    const salonId = request.user.salonId as string;
    const ownerName = (request.user.name as string) || 'Owner';

    // ── Delegate to AI service ─────────────────────────────────────────────────
    try {
      const { AIService } = require('../services/aiService');
      const answer: string = await AIService.askAdvisor(salonId, ownerName, trimmed);

      return reply.send({
        success: true,
        answer
      });
    } catch (err: any) {
      server.log.error('[AI Route] Unexpected error:', err?.message || err);
      return reply.status(500).send({
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      });
    }
  });
};

export default aiRoutes;
