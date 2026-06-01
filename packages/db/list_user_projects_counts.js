const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  const users = await prisma.user.findMany({ include: { projects: { select: { id: true } } } });
  for (const u of users) {
    console.log(`User ${u.id} has ${u.projects.length} projects`);
  }
  await prisma.$disconnect();
})();
