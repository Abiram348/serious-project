const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('ERROR: No users found');
    process.exit(1);
  }
  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: 'Test Agent Pipeline',
      description: 'A simple HTML page with a button',
      status: 'PENDING',
    }
  });
  console.log('Created project:', project.id);
  prisma.\$disconnect();
})();
