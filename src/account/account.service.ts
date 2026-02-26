import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, createAccountDto: CreateAccountDto) {
    let ledgerId = createAccountDto.ledgerId;

    // If no ledgerId provided, use default ledger
    if (!ledgerId) {
      const defaultLedger = await this.prisma.ledger.findFirst({
        where: { userId, isDefault: true },
      });
      if (!defaultLedger) {
        throw new ForbiddenException('没有默认账本，请先创建账本');
      }
      ledgerId = defaultLedger.id;
    } else {
      // Verify ledger belongs to user
      const ledger = await this.prisma.ledger.findFirst({
        where: { id: ledgerId, userId },
      });
      if (!ledger) {
        throw new ForbiddenException('账本不存在或无权限');
      }
    }

    // Get max sortOrder for the ledger
    const maxSort = await this.prisma.account.findFirst({
      where: { ledgerId },
      orderBy: { sortOrder: 'desc' },
    });

    return this.prisma.account.create({
      data: {
        ...createAccountDto,
        ledgerId,
        userId,
        sortOrder: (maxSort?.sortOrder ?? 0) + 1,
      },
    });
  }

  async findAll(userId: number, ledgerId?: number) {
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

    return this.prisma.account.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: number, userId: number, ledgerId?: number) {
    const where: any = { id, userId };
    if (ledgerId) {
      where.ledgerId = ledgerId;
    }

    const account = await this.prisma.account.findFirst({ where });
    if (!account) throw new NotFoundException('账户不存在');
    return account;
  }

  async update(id: number, userId: number, dto: UpdateAccountDto) {
    const account = await this.findOne(id, userId);

    return this.prisma.account.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number, userId: number) {
    const account = await this.findOne(id, userId);

    // Check if account has transactions
    const transactionCount = await this.prisma.transaction.count({
      where: { accountId: id },
    });

    if (transactionCount > 0) {
      // Soft delete by archiving
      return this.prisma.account.update({
        where: { id },
        data: { isArchived: true },
      });
    }

    // Hard delete if no transactions
    return this.prisma.account.delete({ where: { id } });
  }

  async updateSortOrder(id: number, userId: number, sortOrder: number) {
    const account = await this.findOne(id, userId);

    return this.prisma.account.update({
      where: { id },
      data: { sortOrder },
    });
  }
}
