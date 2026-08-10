import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma';

const customerRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.get('/', { preValidation: [(server as unknown as { authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }).authenticate] }, async (request) => {
    const user = request.user as { salonId: string };
    const customers = await prisma.customer.findMany({
      where: { salonId: user.salonId },
      orderBy: { ltv: 'desc' }
    });
    return { success: true, data: customers };
  });

  server.post('/', { preValidation: [(server as unknown as { authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }).authenticate] }, async (request) => {
    const user = request.user as { salonId: string };
    const body = request.body as { name: string; email?: string; phone?: string };

    const customer = await prisma.customer.create({
      data: {
        ...body,
        salonId: user.salonId
      }
    });

    return { success: true, data: customer };
  });
};

export default customerRoutes;
