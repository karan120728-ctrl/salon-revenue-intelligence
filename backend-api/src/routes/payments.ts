import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';

const paymentsRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.addHook('preValidation', (server as any).authenticate);

  server.get('/', async (request: any, reply) => {
    const salonId = request.user.salonId;
    const payments = await prisma.payment.findMany({
      where: { salonId },
      include: {
        customer: { select: { name: true } },
      },
      orderBy: { paymentDate: 'desc' }
    });
    return { success: true, data: payments };
  });

  server.post('/', async (request: any, reply) => {
    const salonId = request.user.salonId;
    const { amount, method, appointmentId, customerId } = request.body as any;

    if (!amount || !customerId) {
      return reply.code(400).send({ success: false, message: 'Amount and customerId are required' });
    }

    const payment = await prisma.payment.create({
      data: {
        amount: parseFloat(amount),
        method: method || 'CARD',
        appointmentId,
        customerId,
        salonId
      }
    });

    return { success: true, data: payment };
  });
};

export default paymentsRoutes;
