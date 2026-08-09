import 'dotenv/config';
import fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';

import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import retentionRoutes from './routes/retention';
import noshowRoutes from './routes/noshow';
import staffRoutes from './routes/staff';
import leakRoutes from './routes/leak';
import inventoryRoutes from './routes/inventory';

const server = fastify({ logger: true });

// ── Plugins ──────────────────────────────────────────────────────────────────
server.register(cors, { origin: process.env.CORS_ORIGIN || '*' });

server.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
});

// Decorate with authenticate hook — every protected route calls this
server.decorate('authenticate', async function (request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});

// ── Routes (Operational) ────────────────────────────────────────────────────────
server.register(authRoutes,      { prefix: '/auth' });
server.register(async (api) => {
  api.register(require('./routes/customers').default, { prefix: '/customers' });
  api.register(require('./routes/staff').default, { prefix: '/staff' });
  api.register(require('./routes/services').default, { prefix: '/services' });
  api.register(require('./routes/appointments').default, { prefix: '/appointments' });
  api.register(require('./routes/payments').default, { prefix: '/payments' });
  api.register(require('./routes/inventory').default, { prefix: '/inventory' });
}, { prefix: '/api' });

// ── Routes (Analytics Engine) ───────────────────────────────────────────────
server.register(require('./routes/analytics').default, { prefix: '/api/analytics' });

// Health check (public)
server.get('/health', async () => ({ status: 'ok', message: 'Salon API is running 🚀' }));

// ── Start ─────────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001');
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`✅ Server started on http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
