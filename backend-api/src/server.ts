import 'dotenv/config';
import fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';

import authRoutes from './routes/auth';
import customerRoutes from './routes/customers';
import staffRoutes from './routes/staff';
import serviceRoutes from './routes/services';
import appointmentRoutes from './routes/appointments';
import paymentRoutes from './routes/payments';
import inventoryRoutes from './routes/inventory';
import analyticsRoutes from './routes/analytics';
import aiRoutes from './routes/ai';

const server = fastify({ logger: true });

// ── Plugins ──────────────────────────────────────────────────────────────────
server.register(cors, { origin: process.env.CORS_ORIGIN || '*' });

server.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
});

// Decorate with authenticate hook — every protected route calls this
server.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});

// ── Routes (Operational) ────────────────────────────────────────────────────────
server.register(authRoutes, { prefix: '/auth' });

server.register(async (api) => {
  api.register(customerRoutes, { prefix: '/customers' });
  api.register(staffRoutes, { prefix: '/staff' });
  api.register(serviceRoutes, { prefix: '/services' });
  api.register(appointmentRoutes, { prefix: '/appointments' });
  api.register(paymentRoutes, { prefix: '/payments' });
  api.register(inventoryRoutes, { prefix: '/inventory' });
}, { prefix: '/api' });

// ── Routes (Analytics Engine) ───────────────────────────────────────────────
server.register(analyticsRoutes, { prefix: '/api/analytics' });

// ── Routes (AI Advisor) — separate from analytics, own capability namespace ──
server.register(aiRoutes, { prefix: '/api/ai' });

// Health check (public)
server.get('/health', async () => ({ status: 'ok', message: 'Salon API is running 🚀' }));

// ── Start ─────────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001', 10);
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`✅ Server started on http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
