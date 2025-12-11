import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.category.findMany({
    where: {
      userId: null,
    },
    orderBy: {
      type: 'asc',
    },
  });

  console.log('--- System Categories ---');
  categories.forEach((c) => {
    console.log(`[${c.type}] ${c.name} (Icon: ${c.icon})`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
