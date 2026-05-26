import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.team.updateMany({
    where:  { category: 'Mayores' },
    data:   { category: 'Senior' },
  });
  console.log(`Updated ${result.count} team(s) from "Mayores" → "Senior"`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
