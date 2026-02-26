import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, dto: CreateCategoryDto) {
    // Verify ledger belongs to user
    const ledger = await this.prisma.ledger.findFirst({
      where: { id: dto.ledgerId, userId },
    });
    if (!ledger) {
      throw new ForbiddenException('账本不存在或无权限');
    }

    return this.prisma.category.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  async findAll(userId: number, ledgerId?: number) {
    const where: any = {
      OR: [
        { userId },
        { userId: null }
      ]
    };

    // If ledgerId is provided, filter by ledger
    if (ledgerId) {
      // Verify ledger belongs to user
      const ledger = await this.prisma.ledger.findFirst({
        where: { id: ledgerId, userId },
      });
      if (!ledger) {
        throw new ForbiddenException('账本不存在或无权限');
      }
      where.OR = [
        { ledgerId },
        { userId: null } // System categories are available for all ledgers
      ];
    }

    return this.prisma.category.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
  }
}
