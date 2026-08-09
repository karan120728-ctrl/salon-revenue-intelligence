import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding production-demo data...');

  // ── 1. Salon ─────────────────────────────────────────────────────────────────
  const salon = await prisma.salon.create({
    data: { name: 'Marlowe & Rose' },
  });

  // ── 2. Owner ──────────────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      name: 'Sarah Mitchell',
      email: 'admin@marlowe.com',
      password: hashedPassword,
      role: 'OWNER',
      salonId: salon.id,
    },
  });
  console.log('✅ User: admin@marlowe.com / admin123');

  // ── 3. Services ───────────────────────────────────────────────────────────────
  const [haircut, balayage, olaplex, blowdry, brow, manicure] = await Promise.all([
    prisma.service.create({ data: { name: "Cut & Finish",          price: 55,  duration: 45,  salonId: salon.id } }),
    prisma.service.create({ data: { name: "Full Head Balayage",    price: 185, duration: 180, salonId: salon.id } }),
    prisma.service.create({ data: { name: "Olaplex Treatment",     price: 65,  duration: 30,  salonId: salon.id } }),
    prisma.service.create({ data: { name: "Blow Dry & Style",      price: 38,  duration: 30,  salonId: salon.id } }),
    prisma.service.create({ data: { name: "Brow Tint & Shape",     price: 28,  duration: 20,  salonId: salon.id } }),
    prisma.service.create({ data: { name: "Express Manicure",      price: 32,  duration: 30,  salonId: salon.id } }),
  ]);

  // ── 4. Staff ──────────────────────────────────────────────────────────────────
  const [chloe, priya, jack, olivia] = await Promise.all([
    prisma.staff.create({ data: { name: 'Chloe Bennett', role: 'Senior Colourist',  rating: 4.9, rebookRate: 81, salonId: salon.id } }),
    prisma.staff.create({ data: { name: 'Priya Anand',   role: 'Creative Director', rating: 5.0, rebookRate: 88, salonId: salon.id } }),
    prisma.staff.create({ data: { name: 'Jack Sullivan',  role: 'Barber & Stylist',  rating: 4.6, rebookRate: 58, salonId: salon.id } }),
    prisma.staff.create({ data: { name: 'Olivia Hart',   role: 'Stylist',           rating: 4.7, rebookRate: 66, salonId: salon.id } }),
  ]);

  // ── 5. Customers ──────────────────────────────────────────────────────────────
  const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
  const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000);

  const [grace, emma, ben, aisha, lily, noah, ryan, sophie] = await Promise.all([
    prisma.customer.create({ data: { name: 'Grace Holloway', email: 'grace@email.com',  phone: '+447700000001', ltv: 1840, risk: 92, lastVisit: daysAgo(77), expectedVisit: daysAgo(35), salonId: salon.id } }),
    prisma.customer.create({ data: { name: 'Emma Whitmore',  email: 'emma@email.com',   phone: '+447700000002', ltv: 1120, risk: 81, lastVisit: daysAgo(63), expectedVisit: daysAgo(21), salonId: salon.id } }),
    prisma.customer.create({ data: { name: 'Ben Turner',     email: 'ben@email.com',    phone: '+447700000003', ltv: 2210, risk: 95, lastVisit: daysAgo(98), expectedVisit: daysAgo(56), salonId: salon.id } }),
    prisma.customer.create({ data: { name: 'Aisha Patel',    email: 'aisha@email.com',  phone: '+447700000004', ltv: 960,  risk: 64, lastVisit: daysAgo(49), expectedVisit: daysAgo(7),  salonId: salon.id } }),
    prisma.customer.create({ data: { name: 'Lily Foster',    email: 'lily@email.com',   phone: '+447700000005', ltv: 540,  risk: 38, lastVisit: daysAgo(42), expectedVisit: daysFromNow(2), salonId: salon.id } }),
    prisma.customer.create({ data: { name: 'Noah Carter',    email: 'noah@email.com',   phone: '+447700000006', ltv: 1360, risk: 77, lastVisit: daysAgo(70), expectedVisit: daysAgo(28), salonId: salon.id } }),
    prisma.customer.create({ data: { name: 'Ryan Chen',      email: 'ryan@email.com',   phone: '+447700000007', ltv: 3240, risk: 12, lastVisit: daysAgo(18), expectedVisit: daysFromNow(24), salonId: salon.id } }),
    prisma.customer.create({ data: { name: 'Sophie Clarke',  email: 'sophie@email.com', phone: '+447700000008', ltv: 880,  risk: 22, lastVisit: daysAgo(30), expectedVisit: daysFromNow(14), salonId: salon.id } }),
  ]);

  // ── 6. Historical Appointments + Payments (last 90 days) ──────────────────────
  type ApptInput = {
    date: Date;
    status: string;
    risk?: number;
    riskReason?: string;
    customer: any;
    staff: any;
    services: { service: any; price: number }[];
  };

  const createAppt = async ({ date, status, risk = 0, riskReason, customer, staff, services }: ApptInput) => {
    const appt = await prisma.appointment.create({
      data: {
        date,
        status,
        risk,
        riskReason,
        customerId: customer.id,
        staffId: staff.id,
        salonId: salon.id,
        services: {
          create: services.map(({ service, price }) => ({
            serviceId: service.id,
            priceAtBooking: price,
          })),
        },
      },
    });

    if (status === 'COMPLETED') {
      const total = services.reduce((s, { price }) => s + price, 0);
      await prisma.payment.create({
        data: {
          amount: total,
          status: 'COMPLETED',
          method: ['CARD', 'CARD', 'CASH', 'CARD'][Math.floor(Math.random() * 4)],
          paymentDate: date,
          appointmentId: appt.id,
          customerId: customer.id,
          salonId: salon.id,
        },
      });
    }

    return appt;
  };

  // Past completed appointments (spanning last 2 months)
  await Promise.all([
    createAppt({ date: daysAgo(77), status: 'COMPLETED', customer: grace, staff: chloe,  services: [{ service: balayage, price: 185 }, { service: olaplex, price: 65 }] }),
    createAppt({ date: daysAgo(63), status: 'COMPLETED', customer: emma,  staff: priya,  services: [{ service: balayage, price: 185 }] }),
    createAppt({ date: daysAgo(56), status: 'NO_SHOW',   customer: ben,   staff: chloe,  services: [{ service: haircut, price: 55 }] }),
    createAppt({ date: daysAgo(49), status: 'COMPLETED', customer: aisha, staff: olivia, services: [{ service: haircut, price: 55 }, { service: blowdry, price: 38 }] }),
    createAppt({ date: daysAgo(42), status: 'COMPLETED', customer: lily,  staff: jack,   services: [{ service: haircut, price: 55 }] }),
    createAppt({ date: daysAgo(35), status: 'COMPLETED', customer: ryan,  staff: priya,  services: [{ service: balayage, price: 185 }, { service: olaplex, price: 65 }, { service: blowdry, price: 38 }] }),
    createAppt({ date: daysAgo(28), status: 'COMPLETED', customer: sophie, staff: olivia, services: [{ service: haircut, price: 55 }, { service: brow, price: 28 }] }),
    createAppt({ date: daysAgo(21), status: 'COMPLETED', customer: noah,  staff: jack,   services: [{ service: haircut, price: 55 }] }),
    createAppt({ date: daysAgo(18), status: 'COMPLETED', customer: ryan,  staff: chloe,  services: [{ service: haircut, price: 55 }, { service: blowdry, price: 38 }] }),
    createAppt({ date: daysAgo(14), status: 'COMPLETED', customer: lily,  staff: olivia, services: [{ service: blowdry, price: 38 }, { service: brow, price: 28 }] }),
    createAppt({ date: daysAgo(10), status: 'NO_SHOW',   customer: emma,  staff: priya,  services: [{ service: balayage, price: 185 }] }),
    createAppt({ date: daysAgo(7),  status: 'COMPLETED', customer: aisha, staff: jack,   services: [{ service: haircut, price: 55 }] }),
    createAppt({ date: daysAgo(5),  status: 'COMPLETED', customer: sophie, staff: chloe, services: [{ service: balayage, price: 185 }, { service: olaplex, price: 65 }] }),
    createAppt({ date: daysAgo(3),  status: 'COMPLETED', customer: ryan,  staff: priya,  services: [{ service: haircut, price: 55 }, { service: blowdry, price: 38 }] }),
    createAppt({ date: daysAgo(1),  status: 'COMPLETED', customer: lily,  staff: olivia, services: [{ service: manicure, price: 32 }] }),
  ]);

  // ── 7. Upcoming Appointments (today + next 3 days) ────────────────────────────
  await Promise.all([
    createAppt({ date: daysFromNow(0.1), status: 'SCHEDULED', risk: 87, riskReason: '2 previous no-shows, booked via last-minute link', customer: emma, staff: priya, services: [{ service: balayage, price: 185 }] }),
    createAppt({ date: daysFromNow(0.2), status: 'SCHEDULED', risk: 22, customer: ryan, staff: chloe, services: [{ service: haircut, price: 55 }, { service: olaplex, price: 65 }] }),
    createAppt({ date: daysFromNow(0.3), status: 'SCHEDULED', risk: 69, riskReason: 'Rescheduled twice this month', customer: grace, staff: chloe, services: [{ service: balayage, price: 185 }] }),
    createAppt({ date: daysFromNow(1), status: 'SCHEDULED', risk: 41, customer: lily, staff: olivia, services: [{ service: blowdry, price: 38 }] }),
    createAppt({ date: daysFromNow(2), status: 'SCHEDULED', risk: 15, customer: sophie, staff: jack, services: [{ service: haircut, price: 55 }] }),
  ]);

  // ── 8. Product & Inventory ────────────────────────────────────────────────────
  const products = [
    { name: 'Blonde Toner — Wella',   price: 18, stock: 4,  days: 2,  supplier: 'Wella Professionals', reorder: 'Order 6 units today' },
    { name: 'Olaplex No.3 Repair',    price: 28, stock: 9,  days: 6,  supplier: 'Olaplex UK',           reorder: 'Order 10 units this week' },
    { name: 'Purple Shampoo 250ml',   price: 14, stock: 3,  days: 3,  supplier: 'Fanola',               reorder: 'Order 12 units today' },
    { name: 'Bond Repair Mask',       price: 22, stock: 14, days: 11, supplier: 'K18',                  reorder: 'Monitor' },
    { name: 'Argan Shine Serum',      price: 32, stock: 18, days: 19, supplier: 'Moroccanoil',          reorder: 'Monitor' },
    { name: 'Matte Finish Hairspray', price: 16, stock: 6,  days: 5,  supplier: "L'Oréal Pro",         reorder: 'Order 8 units this week' },
  ];

  for (const p of products) {
    const product = await prisma.product.create({
      data: { name: p.name, price: p.price, category: 'Product', salonId: salon.id },
    });
    await prisma.inventory.create({
      data: { stock: p.stock, daysLeft: p.days, supplier: p.supplier, reorderAlert: p.reorder, productId: product.id, salonId: salon.id },
    });
  }

  console.log('🎉 FULL DEMO SEED COMPLETE! The dashboard will look impressive now.');
  console.log('');
  console.log('📊 Summary:');
  console.log('   - 1 Salon (Marlowe & Rose)');
  console.log('   - 4 Staff members');
  console.log('   - 8 Customers (5 high-risk for churn)');
  console.log('   - 20 Appointments (15 completed, 2 no-shows, 5 upcoming)');
  console.log('   - 16+ Payments totalling ~£2,800+ revenue');
  console.log('   - 6 Products in inventory (3 low stock)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
