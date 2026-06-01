const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: 'cmppges7v0000titv3bq3prf5' },
    include: { projects: true },
  });
  console.log('User projects count:', user.projects.length);
  await prisma.$disconnect();
})();
