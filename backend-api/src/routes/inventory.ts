import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';

const inventoryRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.addHook('preValidation', (server as any).authenticate);

  server.get('/', async (request: any, reply) => {
    const salonId = request.user.salonId;

    const inventory = await prisma.inventory.findMany({
      where: { salonId },
      include: {
        product: { select: { name: true, price: true, category: true } }
      },
      orderBy: { daysLeft: 'asc' }
    });

    const lowStockCount = inventory.filter(i => i.daysLeft <= 5).length;

    return {
      success: true,
      data: {
        items: inventory.map(i => ({
          id: i.id,
          name: i.product.name,
          price: i.product.price,
          stock: i.stock,
          days: i.daysLeft,
          supplier: i.supplier,
          reorder: i.reorderAlert,
        })),
        lowStockCount,
        total: inventory.length,
      }
    };
  });
};

export default inventoryRoutes;
