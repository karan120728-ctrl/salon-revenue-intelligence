import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma';

const staffRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.get('/', { preValidation: [(server as unknown as { authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }).authenticate] }, async (request) => {
    const user = request.user as { salonId: string };
    const staffMembers = await prisma.staff.findMany({
      where: { salonId: user.salonId },
      orderBy: { name: 'asc' }
    });
    return { success: true, data: staffMembers };
  });

  server.post('/', { preValidation: [(server as unknown as { authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }).authenticate] }, async (request) => {
    const user = request.user as { salonId: string };
    const body = request.body as { name: string; role: string; rating?: number; rebookRate?: number };

    const staffMember = await prisma.staff.create({
      data: {
        ...body,
        salonId: user.salonId
      }
    });

    return { success: true, data: staffMember };
  });
};

export default staffRoutes;
