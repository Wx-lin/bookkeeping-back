import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType } from '../transaction/dto/create-transaction.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getAssetsOverview(userId: number) {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
    });

    const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
    return {
      totalBalance,
      accounts,
    };
  }

  async getTrend(userId: number, startDate?: string, endDate?: string) {
    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(startDate && endDate && {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
    };

    const transactions = await this.prisma.transaction.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    // Group by date and type
    const trend = {};
    transactions.forEach(t => {
      const dateStr = t.date.toISOString().split('T')[0];
      if (!trend[dateStr]) {
        trend[dateStr] = { expense: 0, income: 0 };
      }
      if (t.type === TransactionType.EXPENSE) {
        trend[dateStr].expense += Number(t.amount);
      } else if (t.type === TransactionType.INCOME) {
        trend[dateStr].income += Number(t.amount);
      }
    });

    return Object.entries(trend).map(([date, data]) => ({
      date,
      ...data as any
    }));
  }

  async getCategoryStats(userId: number, startDate?: string, endDate?: string) {
    const where: Prisma.TransactionWhereInput = {
      userId,
      type: TransactionType.EXPENSE,
      ...(startDate && endDate && {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
    };

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: { category: true },
    });

    const stats = {};
    transactions.forEach(t => {
      const catName = t.category?.name || 'Uncategorized';
      if (!stats[catName]) {
        stats[catName] = 0;
      }
      stats[catName] += Number(t.amount);
    });

    return Object.entries(stats).map(([name, value]) => ({
      name,
      value,
    }));
  }
}
