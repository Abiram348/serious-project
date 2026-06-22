const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const runs = await prisma.agentRun.findMany({
    where: { projectId: 'cmqde3sca000lpfd1mj0t3dob' },
    orderBy: { createdAt: 'desc' },
  });
  for (const run of runs) {
    const logs = await prisma.agentLog.findMany({
      where: { agentRunId: run.id },
      orderBy: { timestamp: 'desc' },
      take: 3,
    });
    console.log('=== ' + run.agentType + ' ' + run.status + ' ===');
    for (const log of logs) {
      console.log(log.level + ':', (log.message || '').substring(0, 200));
    }
  }
}
main().finally(() => prisma.$disconnect());
