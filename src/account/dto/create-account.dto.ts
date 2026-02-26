import { IsNotEmpty, IsOptional, IsString, IsNumber, IsInt, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAccountDto {
  @ApiProperty({ description: '账户名称', example: '招商银行储蓄卡' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: '账户类型',
    enum: ['CASH', 'DEBIT', 'CREDIT', 'ALIPAY', 'WECHAT', 'INVESTMENT', 'OTHER'],
    default: 'OTHER',
  })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({
    description: '初始余额',
    example: 10000.0,
    default: 0,
  })
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

  @ApiPropertyOptional({ description: '所属账本ID，不传则使用默认账本', example: 1 })
  @IsInt()
  @IsOptional()
  ledgerId?: number;
}
