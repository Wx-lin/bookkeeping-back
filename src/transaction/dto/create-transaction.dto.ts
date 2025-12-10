import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsDateString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TransactionType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
  TRANSFER = 'TRANSFER',
}

export class CreateTransactionDto {
  @ApiProperty({ description: '金额', example: 50.0 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    description: '交易类型',
    enum: TransactionType,
    example: TransactionType.EXPENSE,
  })
  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @ApiPropertyOptional({
    description: '交易时间 (ISO 8601)',
    example: '2023-12-01T10:00:00Z',
    default: '当前时间',
  })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ description: '备注描述', example: '超市购物' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '关联账户 ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  accountId: number;

  @ApiPropertyOptional({ description: '关联分类 ID', example: 1 })
  @IsNumber()
  @IsOptional()
  categoryId?: number;

  @ApiPropertyOptional({
    description: '转账目标账户 ID (仅转账类型有效)',
    example: 2,
  })
  @IsNumber()
  @IsOptional()
  toAccountId?: number;
}
