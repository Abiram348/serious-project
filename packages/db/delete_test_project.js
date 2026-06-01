const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const projectId = 'cmpv9b11m000110y01dho6yn7';
    await prisma.$transaction([
      prisma.agentRun.deleteMany({ where: { projectId } }),
      prisma.projectFile.deleteMany({ where: { projectId } }),
      prisma.chatMessage.deleteMany({ where: { projectId } }),
      prisma.buildLog.deleteMany({ where: { projectId } }),
      prisma.usageLog.deleteMany({ where: { projectId } }),
      prisma.project.delete({ where: { id: projectId } }),
    ]);
    console.log('Deleted test project', projectId);
  } catch (e) {
    console.error('Deletion error', e);
  } finally {
    await prisma.$disconnect();
  }
})();
