const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    // Find FREE‑plan users with 3 or more projects
    const users = await prisma.user.findMany({
      where: { plan: 'FREE' },
      include: { projects: { select: { id: true } } },
    });
    let deleted = false;
    for (const user of users) {
      if (user.projects.length >= 3) {
        const projId = user.projects[0].id;
        await prisma.project.delete({ where: { id: projId } });
        console.log(`Deleted project ${projId} for user ${user.id}`);
        deleted = true;
        break;
      }
    }
    if (!deleted) console.log('No user with 3+ projects found – nothing to delete.');
  } catch (e) {
    console.error('Error during cleanup:', e);
  } finally {
    await prisma.$disconnect();
  }
})();
