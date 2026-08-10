import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { AIService } from '../services/aiService';

const aiRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  // All AI routes require authentication — salonId comes from the JWT, never from the request body
  server.addHook('preValidation', (server as unknown as { authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }).authenticate);

  // POST /api/ai/advisor
  // Body: { query: string }
  // Returns: { success: true, answer: string }
  server.post('/advisor', async (request, reply) => {
    // ── Input validation ──────────────────────────────────────────────────────
    const { query, history } = (request.body || {}) as {
      query?: unknown;
      history?: Array<{ role: 'user' | 'ai'; text: string }>;
    };

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
    const user = request.user as { salonId: string; name?: string };
    const salonId = user.salonId;
    const ownerName = user.name || 'Owner';

    // ── Delegate to AI service ─────────────────────────────────────────────────
    try {
      const answer: string = await AIService.askAdvisor(
        salonId,
        ownerName,
        trimmed,
        Array.isArray(history) ? history : []
      );

      return reply.send({
        success: true,
        answer
      });
    } catch (err: unknown) {
      server.log.error(`[AI Route] Unexpected error: ${(err as Error)?.message || String(err)}`);
      return reply.status(500).send({
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      });
    }
  });
};

export default aiRoutes;
