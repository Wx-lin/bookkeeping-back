import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType } from '../transaction/dto/create-transaction.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getAssetsOverview(userId: number, ledgerId?: number) {
    const where: any = { userId };
    if (ledgerId) {
      // Verify ledger belongs to user
      const ledger = await this.prisma.ledger.findFirst({
        where: { id: ledgerId, userId },
      });
      if (!ledger) {
        throw new ForbiddenException('账本不存在或无权限');
      }
      where.ledgerId = ledgerId;
    }

    const accounts = await this.prisma.account.findMany({ where });

    const totalBalance = accounts.reduce(
      (sum, acc) => sum + Number(acc.balance),
      0,
    );
    return {
      totalBalance,
      accounts,
    };
  }

  async getTrend(userId: number, startDate?: string, endDate?: string, ledgerId?: number) {
    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(ledgerId && { ledgerId }),
      ...(startDate &&
        endDate && {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
    };

    // Validate ledger if provided
    if (ledgerId) {
      const ledger = await this.prisma.ledger.findFirst({
        where: { id: ledgerId, userId },
      });
      if (!ledger) {
        throw new ForbiddenException('账本不存在或无权限');
      }
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    // Group by date and type
    const trend = {};
    transactions.forEach((t) => {
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
      ...(data as any),
    }));
  }

  async getCategoryStats(
    userId: number,
    startDate?: string,
    endDate?: string,
    type: TransactionType = TransactionType.EXPENSE,
    ledgerId?: number,
  ) {
    const where: Prisma.TransactionWhereInput = {
      userId,
      type,
      ...(ledgerId && { ledgerId }),
      ...(startDate &&
        endDate && {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
    };

    // Validate ledger if provided
    if (ledgerId) {
      const ledger = await this.prisma.ledger.findFirst({
        where: { id: ledgerId, userId },
      });
      if (!ledger) {
        throw new ForbiddenException('账本不存在或无权限');
      }
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: { category: true },
    });

    const stats = {};
    transactions.forEach((t) => {
      const catName = t.category?.name || '无分类';
      if (!stats[catName]) {
        stats[catName] = 0;
      }
      stats[catName] += Number(t.amount);
    });

    return Object.entries(stats)
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort((a, b) => (b.value as number) - (a.value as number));
  }
}
