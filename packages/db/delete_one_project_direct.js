const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const project = await prisma.project.findFirst();
    if (!project) {
      console.log('No projects found to delete.');
      return;
    }
    console.log('Deleting project:', project.id, project.name);
    await prisma.project.delete({ where: { id: project.id } });
    console.log('Project deleted successfully.');
  } catch (e) {
    console.error('Error deleting project:', e);
  } finally {
    await prisma.$disconnect();
  }
})();
