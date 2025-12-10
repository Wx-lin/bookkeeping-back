import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTransactionDto,
  TransactionType,
} from './dto/create-transaction.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, dto: CreateTransactionDto) {
    const {
      amount,
      type,
      accountId,
      toAccountId,
      categoryId,
      date,
      description,
    } = dto;
    const amountDecimal = new Prisma.Decimal(amount);

    return this.prisma.$transaction(async (tx) => {
      // 1. Validate Account
      const account = await tx.account.findUnique({ where: { id: accountId } });
      if (!account || account.userId !== userId) {
        throw new NotFoundException('Source account not found');
      }

      // 2. Prepare Transaction Data
      const data: Prisma.TransactionCreateInput = {
        amount: amountDecimal,
        type,
        date: date ? new Date(date) : new Date(),
        description,
        user: { connect: { id: userId } },
        account: { connect: { id: accountId } },
      };

      if (categoryId) {
        data.category = { connect: { id: categoryId } };
      }

      // 3. Handle Balance Updates based on Type
      if (type === TransactionType.EXPENSE) {
        await tx.account.update({
          where: { id: accountId },
          data: { balance: { decrement: amountDecimal } },
        });
      } else if (type === TransactionType.INCOME) {
        await tx.account.update({
          where: { id: accountId },
          data: { balance: { increment: amountDecimal } },
        });
      } else if (type === TransactionType.TRANSFER) {
        if (!toAccountId) {
          throw new BadRequestException('Target account required for transfer');
        }
        const toAccount = await tx.account.findUnique({
          where: { id: toAccountId },
        });
        if (!toAccount || toAccount.userId !== userId) {
          throw new NotFoundException('Target account not found');
        }

        data.toAccountId = toAccountId;

        // Decrement source
        await tx.account.update({
          where: { id: accountId },
          data: { balance: { decrement: amountDecimal } },
        });

        // Increment target
        await tx.account.update({
          where: { id: toAccountId },
          data: { balance: { increment: amountDecimal } },
        });
      }

      // 4. Create Record
      return tx.transaction.create({ data });
    });
  }

  async findAll(userId: number, query: any) {
    const { page = 1, limit = 20, type, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(type && { type }),
      ...(startDate &&
        endDate && {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
    };

    const [total, data] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        orderBy: { date: 'desc' },
        include: {
          account: true,
          category: true,
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
