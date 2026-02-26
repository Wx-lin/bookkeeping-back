import { IsOptional, IsString, IsNumber, IsBoolean, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAccountDto {
  @ApiPropertyOptional({ description: '账户名称', example: '招商银行储蓄卡' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: '账户类型',
    enum: ['CASH', 'DEBIT', 'CREDIT', 'ALIPAY', 'WECHAT', 'INVESTMENT', 'OTHER'],
  })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: '余额', example: 10000.0 })
  @IsNumber()
  @IsOptional()
  balance?: number;

  @ApiPropertyOptional({
    description: '信用额度（仅信用卡类型需要）',
    example: 50000.0,
  })
  @IsNumber()
  @IsOptional()
  creditLimit?: number;

  @ApiPropertyOptional({ description: '是否归档/隐藏', default: false })
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;

  @ApiPropertyOptional({ description: '排序顺序', default: 0 })
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
