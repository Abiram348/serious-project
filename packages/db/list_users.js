const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  const users = await prisma.user.findMany({ select: { id: true, clerkId: true, email: true, plan: true } });
  console.log('Users:', users);
  await prisma.$disconnect();
})();
