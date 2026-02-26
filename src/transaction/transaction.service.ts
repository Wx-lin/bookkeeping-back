import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
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
      ledgerId,
      accountId,
      toAccountId,
      categoryId,
      date,
      description,
    } = dto;
    const amountDecimal = new Prisma.Decimal(amount);

    return this.prisma.$transaction(async (tx) => {
      // 1. Validate Ledger belongs to user
      const ledger = await tx.ledger.findFirst({
        where: { id: ledgerId, userId },
      });
      if (!ledger) {
        throw new ForbiddenException('账本不存在或无权限');
      }

      // 2. Validate Account belongs to ledger
      const account = await tx.account.findFirst({
        where: { id: accountId, ledgerId },
      });
      if (!account) {
        throw new NotFoundException('源账户不存在或不属于该账本');
      }

      if (categoryId) {
        const category = await tx.category.findFirst({
          where: { id: categoryId, ledgerId },
        });

        if (!category) {
          throw new NotFoundException('分类不存在或不属于该账本');
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

      // 3. Prepare Transaction Data
      const data: Prisma.TransactionCreateInput = {
        amount: amountDecimal,
        type,
        date: date ? new Date(date) : new Date(),
        description,
        user: { connect: { id: userId } },
        ledger: { connect: { id: ledgerId } },
        account: { connect: { id: accountId } },
      };

      if (categoryId) {
        data.category = { connect: { id: categoryId } };
      }

      // 4. Handle Balance Updates based on Type
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
          throw new BadRequestException('转账需要目标账户');
        }
        const toAccount = await tx.account.findFirst({
          where: { id: toAccountId, ledgerId },
        });
        if (!toAccount) {
          throw new NotFoundException('目标账户不存在或不属于该账本');
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

      // 5. Create Record
      return tx.transaction.create({ data });
    });
  }

  async findAll(userId: number, query: Record<string, any>) {
    const { page = 1, limit = 20, type, startDate, endDate, ledgerId } = query;
    const skip = (Number(page) - 1) * Number(limit);

    // Validate ledger if provided
    if (ledgerId) {
      const ledger = await this.prisma.ledger.findFirst({
        where: { id: Number(ledgerId), userId },
      });
      if (!ledger) {
        throw new ForbiddenException('账本不存在或无权限');
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(ledgerId && { ledgerId: Number(ledgerId) }),
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
      const oldTransaction = await tx.transaction.findFirst({
        where: { id, userId },
      });

      if (!oldTransaction) {
        throw new NotFoundException('交易记录不存在');
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
          throw new BadRequestException('转账需要目标账户');
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
      const transaction = await tx.transaction.findFirst({
        where: { id, userId },
      });

      if (!transaction) {
        throw new NotFoundException('交易记录不存在');
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
