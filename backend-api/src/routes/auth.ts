import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';

interface UserPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  salonId: string;
}

const authRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  // Schema for Register
  const registerSchema = {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'name', 'salonName'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          name: { type: 'string', minLength: 2 },
          salonName: { type: 'string', minLength: 2 }
        }
      }
    }
  };

  server.post('/register', registerSchema, async (request, reply) => {
    const { email, password, name, salonName } = request.body as {
      email: string;
      password: string;
      name: string;
      salonName: string;
    };

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return reply.code(400).send({ success: false, message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create salon and user transactionally
    const user = await prisma.$transaction(async (tx) => {
      const salon = await tx.salon.create({
        data: { name: salonName },
      });

      return tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          salonId: salon.id,
          role: 'OWNER',
        },
      });
    });

    const token = server.jwt.sign({ id: user.id, salonId: user.salonId, role: user.role });

    return reply.send({ success: true, token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  });

  // Schema for Login
  const loginSchema = {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        }
      }
    }
  };

  server.post('/login', loginSchema, async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.code(401).send({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return reply.code(401).send({ success: false, message: 'Invalid credentials' });
    }

    const token = server.jwt.sign({ id: user.id, salonId: user.salonId, role: user.role, name: user.name });

    return reply.send({ success: true, token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  });

  // Protected route for testing
  server.get('/me', { preValidation: [(server as unknown as { authenticate: (req: unknown, rep: unknown) => Promise<void> }).authenticate] }, async (request) => {
    const user = request.user as UserPayload;
    return { success: true, user };
  });
};

export default authRoutes;
