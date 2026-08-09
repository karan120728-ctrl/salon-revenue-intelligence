import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';

const customersRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.addHook('preValidation', (server as any).authenticate);

  server.get('/', async (request: any, reply) => {
    const salonId = request.user.salonId;
    const customers = await prisma.customer.findMany({
      where: { salonId },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: customers };
  });

  server.post('/', async (request: any, reply) => {
    const salonId = request.user.salonId;
    const { name, email, phone } = request.body as any;

    if (!name) {
      return reply.code(400).send({ success: false, message: 'Name is required' });
    }

    const customer = await prisma.customer.create({
      data: { name, email, phone, salonId }
    });

    return { success: true, data: customer };
  });
};

export default customersRoutes;
