const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const userId = 'cmppges7v0000titv3bq3prf5';
    const newProject = await prisma.project.create({
      data: {
        userId,
        name: 'Test Project from script',
        description: 'Created to validate FREE plan limit handling',
        techStack: { frontend: 'next', backend: 'express', db: 'postgres' },
      },
    });
    console.log('✅ Project created:', newProject.id, newProject.name);
  } catch (e) {
    console.error('❌ Error creating project:', e);
  } finally {
    await prisma.$disconnect();
  }
})();
