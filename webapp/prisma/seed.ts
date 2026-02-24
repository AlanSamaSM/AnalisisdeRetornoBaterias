// Seed script — creates a test user
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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
