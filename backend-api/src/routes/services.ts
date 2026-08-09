import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';

const servicesRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.addHook('preValidation', (server as any).authenticate);

  server.get('/', async (request: any, reply) => {
    const salonId = request.user.salonId;
    const services = await prisma.service.findMany({
      where: { salonId },
      orderBy: { name: 'asc' }
    });
    return { success: true, data: services };
  });

  server.post('/', async (request: any, reply) => {
    const salonId = request.user.salonId;
    const { name, price, durationMap } = request.body as any;

    if (!name || price === undefined) {
      return reply.code(400).send({ success: false, message: 'Name and price are required' });
    }

    const service = await prisma.service.create({
      data: { 
        name, 
        price: parseFloat(price), 
        duration: durationMap || 60,
        salonId 
      }
    });

    return { success: true, data: service };
  });
};

export default servicesRoutes;
