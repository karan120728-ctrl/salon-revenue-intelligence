import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../prisma';

const appointmentRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.get('/', { preValidation: [(server as unknown as { authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }).authenticate] }, async (request) => {
    const user = request.user as { salonId: string };
    const appointments = await prisma.appointment.findMany({
      where: { salonId: user.salonId },
      include: {
        customer: true,
        staff: true,
        services: { include: { service: true } }
      },
      orderBy: { date: 'desc' }
    });
    return { success: true, data: appointments };
  });

  server.post('/', { preValidation: [(server as unknown as { authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void> }).authenticate] }, async (request) => {
    const user = request.user as { salonId: string };
    const body = request.body as {
      customerId: string;
      staffId: string;
      date: string;
      serviceIds: string[];
    };

    const appointment = await prisma.appointment.create({
      data: {
        salonId: user.salonId,
        customerId: body.customerId,
        staffId: body.staffId,
        date: new Date(body.date),
        services: {
          create: body.serviceIds.map(serviceId => ({
            service: { connect: { id: serviceId } },
            priceAtBooking: 0
          }))
        }
      }
    });

    return { success: true, data: appointment };
  });
};

export default appointmentRoutes;
