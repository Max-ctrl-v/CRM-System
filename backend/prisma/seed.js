const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const SEED_USERS = [
  { email: 'm.nodes@novaris-consulting.de', password: 'Nodes4652', name: 'M. Nodes', role: 'ADMIN' },
  { email: 'm.menz@novaris-consulting.de', password: 'Menz4652', name: 'M. Menz', role: 'USER' },
  { email: 's.abdalla@novaris-consulting.de', password: 'Abdalla4652', name: 'S. Abdalla', role: 'USER' },
];

async function main() {
  for (const u of SEED_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(u.password, 12);
      await prisma.user.create({
        data: { email: u.email, passwordHash, name: u.name, role: u.role },
      });
      console.log(`Benutzer erstellt: ${u.email} (${u.role})`);
    } else {
      console.log(`Benutzer existiert bereits: ${u.email}`);
    }
  }
}

main()
  .catch((e) => {
    console.error('Seed-Fehler:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
