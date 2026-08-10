import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma';

const inventoryRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.get('/', { preValidation: [(server as unknown as { authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }).authenticate] }, async (request) => {
    const user = request.user as { salonId: string };
    const inventory = await prisma.inventory.findMany({
      where: { salonId: user.salonId },
      include: { product: true },
      orderBy: { daysLeft: 'asc' }
    });

    const lowStockCount = inventory.filter(i => i.daysLeft <= 7).length;

    return { success: true, data: { items: inventory, lowStockCount } };
  });
};

export default inventoryRoutes;
