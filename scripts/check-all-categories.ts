import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.category.count();
  console.log(`Total categories in DB: ${count}`);

  if (count > 0) {
    const categories = await prisma.category.findMany({ take: 10 });
    console.log(categories);
  }
}

main().finally(() => prisma.$disconnect());
