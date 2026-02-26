import { IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ description: '分类名称', example: '餐饮' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: '分类类型',
    example: 'EXPENSE',
    enum: ['EXPENSE', 'INCOME', 'TRANSFER'],
  })
  @IsString()
  @IsNotEmpty()
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';

  @ApiPropertyOptional({ description: '图标 (Emoji 或 URL)', example: '🍔' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ description: '所属账本ID', example: 1 })
  @IsInt()
  @IsNotEmpty()
  ledgerId: number;
}
