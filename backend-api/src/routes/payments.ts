import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma';

const paymentRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.get('/', { preValidation: [(server as unknown as { authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }).authenticate] }, async (request) => {
    const user = request.user as { salonId: string };
    const payments = await prisma.payment.findMany({
      where: { salonId: user.salonId },
      include: { customer: true },
      orderBy: { paymentDate: 'desc' }
    });
    return { success: true, data: payments };
  });

  server.post('/', { preValidation: [(server as unknown as { authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }).authenticate] }, async (request) => {
    const user = request.user as { salonId: string };
    const body = request.body as {
      amount: number;
      customerId: string;
      appointmentId?: string;
      method?: string;
    };

    const payment = await prisma.payment.create({
      data: {
        amount: body.amount,
        customerId: body.customerId,
        appointmentId: body.appointmentId,
        method: body.method || 'CARD',
        salonId: user.salonId
      }
    });

    return { success: true, data: payment };
  });
};

export default paymentRoutes;
