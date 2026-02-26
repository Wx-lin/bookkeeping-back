import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLedgerDto } from './dto/create-ledger.dto';
import { UpdateLedgerDto } from './dto/update-ledger.dto';

@Injectable()
export class LedgerService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, createLedgerDto: CreateLedgerDto) {
    // Check for duplicate name
    const existing = await this.prisma.ledger.findUnique({
      where: {
        userId_name: {
          userId,
          name: createLedgerDto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException('账本名称已存在');
    }

    // If setting as default, unset other defaults first
    if (createLedgerDto.isDefault) {
      await this.prisma.ledger.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.ledger.create({
      data: {
        ...createLedgerDto,
        userId,
      },
    });
  }

  async findAll(userId: number) {
    return this.prisma.ledger.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(userId: number, id: number) {
    const ledger = await this.prisma.ledger.findFirst({
      where: { id, userId },
    });

    if (!ledger) {
      throw new NotFoundException('账本不存在');
    }

    return ledger;
  }

  async findDefault(userId: number) {
    return this.prisma.ledger.findFirst({
      where: { userId, isDefault: true },
    });
  }

  async update(userId: number, id: number, updateLedgerDto: UpdateLedgerDto) {
    await this.findOne(userId, id);

    // Check for duplicate name if changing name
    if (updateLedgerDto.name) {
      const existing = await this.prisma.ledger.findFirst({
        where: {
          userId,
          name: updateLedgerDto.name,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException('账本名称已存在');
      }
    }

    // If setting as default, unset other defaults first
    if (updateLedgerDto.isDefault) {
      await this.prisma.ledger.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.ledger.update({
      where: { id },
      data: updateLedgerDto,
    });
  }

  async remove(userId: number, id: number) {
    const ledger = await this.findOne(userId, id);

    // Prevent deleting the default ledger
    if (ledger.isDefault) {
      throw new ConflictException('不能删除默认账本');
    }

    // Check if ledger has transactions
    const transactionCount = await this.prisma.transaction.count({
      where: { ledgerId: id },
    });

    if (transactionCount > 0) {
      throw new ConflictException('账本中存在交易记录，无法删除');
    }

    return this.prisma.ledger.delete({
      where: { id },
    });
  }

  async getStats(userId: number, id: number) {
    await this.findOne(userId, id);

    const [
      accountCount,
      transactionCount,
      categoryCount,
      totalBalance,
    ] = await Promise.all([
      this.prisma.account.count({ where: { ledgerId: id } }),
      this.prisma.transaction.count({ where: { ledgerId: id } }),
      this.prisma.category.count({ where: { ledgerId: id } }),
      this.prisma.account.aggregate({
        where: { ledgerId: id },
        _sum: { balance: true },
      }),
    ]);

    return {
      accountCount,
      transactionCount,
      categoryCount,
      totalBalance: totalBalance._sum.balance || 0,
    };
  }
}
