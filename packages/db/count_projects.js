const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  const count = await prisma.project.count();
  console.log('Total projects:', count);
  await prisma.$disconnect();
})();
