import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma';

const appointmentsRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.addHook('preValidation', (server as any).authenticate);

  server.get('/', async (request: any, reply) => {
    const salonId = request.user.salonId;
    const appointments = await prisma.appointment.findMany({
      where: { salonId },
      include: {
        customer: { select: { name: true, phone: true } },
        staff: { select: { name: true } },
        services: {
          include: {
            service: { select: { name: true, duration: true } }
          }
        },
        payments: true
      },
      orderBy: { date: 'asc' }
    });
    return { success: true, data: appointments };
  });

  server.post('/', async (request: any, reply) => {
    const salonId = request.user.salonId;
    const { date, customerId, staffId, serviceIds } = request.body as any;

    if (!date || !customerId || !staffId || !serviceIds || !serviceIds.length) {
      return reply.code(400).send({ success: false, message: 'Missing required appointment fields' });
    }

    // Retrieve services to freeze price
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds }, salonId }
    });

    if (services.length !== serviceIds.length) {
      return reply.code(400).send({ success: false, message: 'One or more services not found' });
    }

    const appointment = await prisma.appointment.create({
      data: {
        date: new Date(date),
        customerId,
        staffId,
        salonId,
        services: {
          create: services.map(s => ({
            serviceId: s.id,
            priceAtBooking: s.price
          }))
        }
      },
      include: {
        services: true
      }
    });

    return { success: true, data: appointment };
  });
};

export default appointmentsRoutes;
