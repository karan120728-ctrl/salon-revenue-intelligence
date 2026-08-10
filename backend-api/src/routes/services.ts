import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma';

const serviceRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.get('/', { preValidation: [(server as unknown as { authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }).authenticate] }, async (request) => {
    const user = request.user as { salonId: string };
    const services = await prisma.service.findMany({
      where: { salonId: user.salonId },
      orderBy: { name: 'asc' }
    });
    return { success: true, data: services };
  });

  server.post('/', { preValidation: [(server as unknown as { authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }).authenticate] }, async (request) => {
    const user = request.user as { salonId: string };
    const body = request.body as { name: string; price: number; duration?: number; description?: string };

    const service = await prisma.service.create({
      data: {
        ...body,
        salonId: user.salonId
      }
    });

    return { success: true, data: service };
  });
};

export default serviceRoutes;
