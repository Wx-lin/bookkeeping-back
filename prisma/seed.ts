import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Ensure Categories Exist
  const categoriesData = [
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
    { name: '其他收入', type: 'INCOME', icon: 'others-income', isDefault: true },
  ];

  for (const cat of categoriesData) {
    const exists = await prisma.category.findFirst({
      where: { name: cat.name, type: cat.type, userId: null },
    });
    if (!exists) {
      await prisma.category.create({ data: { ...cat, userId: null } });
    }
  }
  console.log('Categories seeded.');

  // ==========================================
  // Create Specific User: admin@qq.com / 111111
  // ==========================================
  const email = 'admin@qq.com';
  const password = '111111';
  const hashedPassword = await bcrypt.hash(password, 10);

  let user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: '管理员',
        description: '超级管理员账户',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
      },
    });
    console.log(`Created user: ${email} with password: ${password}`);
  } else {
    // Force update password
    user = await prisma.user.update({
      where: { email },
      data: { 
        password: hashedPassword,
        name: user.name || '管理员',
      }
    });
    console.log(`Updated user: ${email} password to: ${password}`);
  }

  // 3. Create Default Ledger for admin if not exists
  let defaultLedger = await prisma.ledger.findFirst({
    where: { userId: user.id, isDefault: true },
  });

  if (!defaultLedger) {
    defaultLedger = await prisma.ledger.create({
      data: {
        name: '默认账本',
        description: '自动创建的默认账本',
        isDefault: true,
        userId: user.id,
      },
    });
    console.log('Default ledger created for admin.');
  }

  // 4. Create Accounts for admin
  const accountsData = [
    { name: '微信钱包', type: 'WeChat', balance: 50000 },
    { name: '支付宝', type: 'Alipay', balance: 88888 },
    { name: '招商银行', type: 'Bank', balance: 500000 },
  ];

  for (const acc of accountsData) {
    const exists = await prisma.account.findFirst({
      where: { name: acc.name, userId: user.id, ledgerId: defaultLedger.id },
    });
    if (!exists) {
      await prisma.account.create({
        data: {
          name: acc.name,
          type: acc.type,
          balance: acc.balance,
          userId: user.id,
          ledgerId: defaultLedger.id,
        },
      });
    }
  }
  const accounts = await prisma.account.findMany({ where: { userId: user.id, ledgerId: defaultLedger.id } });
  console.log('Accounts seeded for admin.');

  // 4. Create Transactions for admin (Dec 2025 & Jan 2026)
  const random = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  
  const expenseCategories = await prisma.category.findMany({ where: { type: 'EXPENSE' } });
  const incomeCategories = await prisma.category.findMany({ where: { type: 'INCOME' } });

  // Check if admin has transactions
  const transactionCount = await prisma.transaction.count({ where: { userId: user.id } });
  
  // Always add more transactions if less than 5 to ensure data visibility
  if (transactionCount < 5) {
      const transactions = [
        // Jan 2026 (Current Month)
        { desc: '星巴克咖啡', amount: -38.00, cat: '餐饮', date: '2026-01-07T10:00:00Z' },
        { desc: '滴滴出行', amount: -55.50, cat: '交通', date: '2026-01-07T18:30:00Z' },
        { desc: '山姆会员店', amount: -528.90, cat: '购物', date: '2026-01-06T15:20:00Z' },
        { desc: '商务午餐', amount: -158.00, cat: '餐饮', date: '2026-01-06T12:00:00Z' },
        { desc: '油费', amount: -300.00, cat: '交通', date: '2026-01-05T09:00:00Z' },
        { desc: '演唱会门票', amount: -1280.00, cat: '娱乐', date: '2026-01-03T20:00:00Z' },
        { desc: '工资收入', amount: 25000.00, cat: '工资', date: '2026-01-01T09:00:00Z' }, 

        // Dec 2025 (Last Month)
        { desc: '房贷', amount: -8500.00, cat: '居住', date: '2025-12-30T10:00:00Z' },
        { desc: '节日聚餐', amount: -820.00, cat: '餐饮', date: '2025-12-25T19:00:00Z' },
        { desc: '年终奖', amount: 50000.00, cat: '奖金', date: '2025-12-31T10:00:00Z' },
        { desc: 'Apple Store', amount: -8999.00, cat: '购物', date: '2025-12-12T14:00:00Z' },
      ];

      for (const t of transactions) {
        const isExpense = t.amount < 0;
        const amount = Math.abs(t.amount);
        const type = isExpense ? 'EXPENSE' : 'INCOME';
        
        // Find category
        const category = (isExpense ? expenseCategories : incomeCategories).find(c => c.name === t.cat);
        if (!category) continue;

        // Random account
        const account = random(accounts);

        await prisma.transaction.create({
          data: {
            amount,
            type,
            date: new Date(t.date),
            description: t.desc,
            userId: user.id,
            ledgerId: defaultLedger.id,
            accountId: account.id,
            categoryId: category.id,
          },
        });
      }
      console.log('Transactions seeded for admin.');
  } else {
      console.log('Transactions already exist for admin, skipping.');
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
