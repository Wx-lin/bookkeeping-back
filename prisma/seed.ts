import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = [
    // 支出分类
    { name: '餐饮', type: 'EXPENSE', icon: 'food', isDefault: true },
    { name: '交通', type: 'EXPENSE', icon: 'transport', isDefault: true },
    { name: '购物', type: 'EXPENSE', icon: 'shopping', isDefault: true },
    { name: '居住', type: 'EXPENSE', icon: 'housing', isDefault: true },
    { name: '娱乐', type: 'EXPENSE', icon: 'entertainment', isDefault: true },
    { name: '医疗', type: 'EXPENSE', icon: 'medical', isDefault: true },
    { name: '教育', type: 'EXPENSE', icon: 'education', isDefault: true },
    { name: '人情', type: 'EXPENSE', icon: 'gift', isDefault: true },
    { name: '其他支出', type: 'EXPENSE', icon: 'others', isDefault: true },

    // 收入分类
    { name: '工资', type: 'INCOME', icon: 'salary', isDefault: true },
    { name: '奖金', type: 'INCOME', icon: 'bonus', isDefault: true },
    { name: '兼职', type: 'INCOME', icon: 'part-time', isDefault: true },
    { name: '理财', type: 'INCOME', icon: 'investment', isDefault: true },
    {
      name: '其他收入',
      type: 'INCOME',
      icon: 'others-income',
      isDefault: true,
    },
  ];

  console.log('Start seeding categories...');

  for (const category of categories) {
    const exists = await prisma.category.findFirst({
      where: {
        name: category.name,
        type: category.type,
        userId: null, // 系统分类
      },
    });

    if (!exists) {
      await prisma.category.create({
        data: {
          ...category,
          userId: null,
        },
      });
      console.log(`Created category: ${category.name}`);
    } else {
      console.log(`Category already exists: ${category.name}`);
    }
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
