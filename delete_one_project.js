const prisma = require('./apps/api/src/prisma/client').default;
(async () => {
  try {
    const projects = await prisma.project.findMany({ take: 1 });
    if (projects.length === 0) {
      console.log('No projects found to delete');
      process.exit(0);
    }
    const projectId = projects[0].id;
    await prisma.project.delete({ where: { id: projectId } });
    console.log('Deleted project', projectId);
  } catch (e) {
    console.error('Error deleting project:', e);
  } finally {
    await prisma.$disconnect();
  }
})();
