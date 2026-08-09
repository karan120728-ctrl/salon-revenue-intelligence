import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';

const staffRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.addHook('preValidation', (server as any).authenticate);

  server.get('/', async (request: any, reply) => {
    const salonId = request.user.salonId;
    const staff = await prisma.staff.findMany({
      where: { salonId },
      orderBy: { name: 'asc' }
    });
    return { success: true, data: staff };
  });

  server.post('/', async (request: any, reply) => {
    const salonId = request.user.salonId;
    const { name, role } = request.body as any;

    if (!name || !role) {
      return reply.code(400).send({ success: false, message: 'Name and role are required' });
    }

    const staffMember = await prisma.staff.create({
      data: { name, role, salonId }
    });

    return { success: true, data: staffMember };
  });
};

export default staffRoutes;
