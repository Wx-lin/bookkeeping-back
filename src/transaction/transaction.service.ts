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
import { UpdateTransactionDto } from './dto/update-transaction.dto';
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

      if (categoryId) {
        const category = await tx.category.findUnique({
          where: { id: categoryId },
        });

        if (!category) {
          throw new NotFoundException('Category not found');
        }

        // 校验分类类型是否与交易类型匹配
        if (
          type !== TransactionType.TRANSFER &&
          category.type !== (type as string)
        ) {
          throw new BadRequestException(
            `分类类型不匹配: 当前交易为 ${type}，但选择了 ${category.type} 类型的分类`,
          );
        }
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

  async findAll(userId: number, query: Record<string, any>) {
    const { page = 1, limit = 20, type, startDate, endDate } = query;
    const skip = (Number(page) - 1) * Number(limit);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(type && { type: String(type) }),
      ...(startDate &&
        endDate && {
          date: {
            gte: new Date(String(startDate)),
            lte: new Date(new Date(String(endDate)).setHours(23, 59, 59, 999)),
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

  async update(id: number, userId: number, dto: UpdateTransactionDto) {
    return this.prisma.$transaction(async (tx) => {
      const oldTransaction = await tx.transaction.findUnique({
        where: { id },
      });

      if (!oldTransaction || oldTransaction.userId !== userId) {
        throw new NotFoundException('Transaction not found');
      }

      // 1. Revert old balance
      const oldAmount = new Prisma.Decimal(oldTransaction.amount);
      const oldType = oldTransaction.type as TransactionType;

      if (oldType === TransactionType.EXPENSE) {
        await tx.account.update({
          where: { id: oldTransaction.accountId },
          data: { balance: { increment: oldAmount } },
        });
      } else if (oldType === TransactionType.INCOME) {
        await tx.account.update({
          where: { id: oldTransaction.accountId },
          data: { balance: { decrement: oldAmount } },
        });
      } else if (oldType === TransactionType.TRANSFER) {
        await tx.account.update({
          where: { id: oldTransaction.accountId },
          data: { balance: { increment: oldAmount } },
        });
        if (oldTransaction.toAccountId) {
          await tx.account.update({
            where: { id: oldTransaction.toAccountId },
            data: { balance: { decrement: oldAmount } },
          });
        }
      }

      // 2. Apply new balance
      const newType = dto.type || oldType;
      const newAmount = dto.amount ? new Prisma.Decimal(dto.amount) : oldAmount;
      const newAccountId = dto.accountId || oldTransaction.accountId;
      const newToAccountId = dto.toAccountId || oldTransaction.toAccountId;

      if (newType === TransactionType.EXPENSE) {
        await tx.account.update({
          where: { id: newAccountId },
          data: { balance: { decrement: newAmount } },
        });
      } else if (newType === TransactionType.INCOME) {
        await tx.account.update({
          where: { id: newAccountId },
          data: { balance: { increment: newAmount } },
        });
      } else if (newType === TransactionType.TRANSFER) {
        if (!newToAccountId)
          throw new BadRequestException('Transfer needs target account');
        await tx.account.update({
          where: { id: newAccountId },
          data: { balance: { decrement: newAmount } },
        });
        await tx.account.update({
          where: { id: newToAccountId },
          data: { balance: { increment: newAmount } },
        });
      }

      // 3. Update Transaction Record
      return tx.transaction.update({
        where: { id },
        data: {
          ...dto,
          date: dto.date ? new Date(dto.date) : undefined,
        },
      });
    });
  }

  async remove(id: number, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id },
      });

      if (!transaction || transaction.userId !== userId) {
        throw new NotFoundException('Transaction not found');
      }

      // Revert balance
      const amount = new Prisma.Decimal(transaction.amount);
      const type = transaction.type as TransactionType;

      if (type === TransactionType.EXPENSE) {
        await tx.account.update({
          where: { id: transaction.accountId },
          data: { balance: { increment: amount } }, // Revert expense (add back)
        });
      } else if (type === TransactionType.INCOME) {
        await tx.account.update({
          where: { id: transaction.accountId },
          data: { balance: { decrement: amount } }, // Revert income (subtract)
        });
      } else if (type === TransactionType.TRANSFER) {
        // Revert transfer: Add to source, subtract from target
        await tx.account.update({
          where: { id: transaction.accountId },
          data: { balance: { increment: amount } },
        });
        if (transaction.toAccountId) {
          await tx.account.update({
            where: { id: transaction.toAccountId },
            data: { balance: { decrement: amount } },
          });
        }
      }

      return tx.transaction.delete({ where: { id } });
    });
  }
}
