const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const users = await prisma.user.findMany({ where: { plan: 'FREE' } });
    console.log('Found FREE users:', users.length);
    for (const user of users) {
      await prisma.user.update({ where: { id: user.id }, data: { plan: 'PRO' } });
      console.log('Updated user', user.id, 'to PRO');
    }
  } catch (e) {
    console.error('Error upgrading:', e);
  } finally {
    await prisma.$disconnect();
  }
})();
