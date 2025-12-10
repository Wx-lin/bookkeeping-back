import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAccountDto {
  @ApiProperty({ description: '账户名称', example: '招商银行储蓄卡' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: '账户类型', example: 'Bank Card' })
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
}
