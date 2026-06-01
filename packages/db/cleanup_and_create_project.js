const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  const userId = 'cmppges7v0000titv3bq3prf5';
  try {
    // Fetch user with projects
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { projects: { select: { id: true, name: true } } },
    });
    if (!user) {
      console.error('User not found');
      return;
    }
    console.log('User projects before cleanup:', user.projects);

    // Choose a project to delete (if any)
    if (user.projects.length === 0) {
      console.log('No projects to delete for user');
    } else {
      const projectId = user.projects[0].id;
      console.log('Deleting project', projectId);
      // Cascade delete dependent rows
      await prisma.$transaction([
        prisma.agentRun.deleteMany({ where: { projectId } }),
        prisma.projectFile.deleteMany({ where: { projectId } }),
        prisma.chatMessage.deleteMany({ where: { projectId } }),
        prisma.buildLog.deleteMany({ where: { projectId } }),
        prisma.usageLog.deleteMany({ where: { projectId } }),
        prisma.project.delete({ where: { id: projectId } }),
      ]);
      console.log('Project deleted');
    }

    // Create a fresh project for the user
    const newProj = await prisma.project.create({
      data: {
        userId,
        name: 'Fresh project after cleanup',
        description: 'Created to verify FREE‑plan limit handling',
        techStack: { frontend: 'next', backend: 'express', db: 'postgres' },
      },
    });
    console.log('✅ New project created:', newProj.id, newProj.name);

    // Verify final project count
    const finalUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { projects: { select: { id: true } } },
    });
    console.log('Final project count for user:', finalUser.projects.length);
  } catch (e) {
    console.error('Error during cleanup & creation:', e);
  } finally {
    await prisma.$disconnect();
  }
})();
