#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@local.test';
  const password = process.env.ADMIN_PASSWORD || 'Password123!';
  const name = process.env.ADMIN_NAME || 'Admin';
  const user_id = process.env.ADMIN_ID || `ADMIN${Date.now()}`;

  const hash = await bcrypt.hash(password, 10);

  // Upsert by unique email. If exists, update hash and role/name.
  await prisma.user.upsert({
    where: { email },
    update: { hash_password: hash, role: 'Admin', name },
    create: {
      user_id,
      name,
      email,
      role: 'Admin',
      membership: 'Regular',
      created_at: new Date(),
      hash_password: hash,
    },
  });

  console.log(`Admin user ensured: ${email}`);
  console.log(`Password (use to login): ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
