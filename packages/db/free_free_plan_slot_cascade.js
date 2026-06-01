const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    // Find a FREE‑plan user who currently has 3+ projects
    const users = await prisma.user.findMany({
      where: { plan: 'FREE' },
      include: { projects: { select: { id: true } } },
    });
    let cleaned = false;
    for (const user of users) {
      if (user.projects.length >= 3) {
        const projectId = user.projects[0].id;
        // Delete all dependent rows before removing the project itself
        await prisma.$transaction([
          prisma.agentRun.deleteMany({ where: { projectId } }),
          prisma.projectFile.deleteMany({ where: { projectId } }),
          prisma.chatMessage.deleteMany({ where: { projectId } }),
          prisma.buildLog.deleteMany({ where: { projectId } }),
          prisma.usageLog.deleteMany({ where: { projectId } }),
          prisma.project.delete({ where: { id: projectId } }),
        ]);
        console.log(`Deleted project ${projectId} (and all related data) for user ${user.id}`);
        cleaned = true;
        break;
      }
    }
    if (!cleaned) console.log('No FREE‑plan user with 3+ projects found; nothing to delete.');
  } catch (e) {
    console.error('Error during cleanup:', e);
  } finally {
    await prisma.$disconnect();
  }
})();
