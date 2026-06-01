const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const userId = 'cmppges7v0000titv3bq3prf5';
    const proj = await prisma.project.create({
      data: {
        userId,
        name: 'Second test project',
        description: 'Ensuring creation works after freeing slot',
        techStack: { frontend: 'next', backend: 'express', db: 'postgres' },
      },
    });
    console.log('✅ Created project', proj.id);
  } catch (e) {
    console.error('❌ Creation error:', e);
  } finally {
    await prisma.$disconnect();
  }
})();
