// Seed script — creates a test user
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Safety guard: never seed weak credentials into production
if (process.env.NODE_ENV === 'production') {
  console.log('\u26a0\ufe0f Seed script skipped in production. Create users via the /registro endpoint.');
  process.exit(0);
}

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'admin@bess.mx' },
    update: {},
    create: {
      email: 'admin@bess.mx',
      name: 'Administrador',
      password,
      empresa: 'BESS Demo',
    },
  });

  console.log('Seed user created:', user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
