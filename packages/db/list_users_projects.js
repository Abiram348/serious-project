const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  const users = await prisma.user.findMany({ include: { projects: true } });
  console.log('User count:', users.length);
  users.forEach(u => console.log('User', u.id, 'projects:', u.projects.length));
  await prisma.$disconnect();
})();
