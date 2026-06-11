const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.count().then(c => {
  console.log('Supabase connected! User count:', c);
  prisma.$disconnect();
}).catch(e => {
  console.error('DB connection failed:', e.message);
  process.exit(1);
});
