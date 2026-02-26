import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateLedgerDto {
  @ApiProperty({ description: '账本名称', example: '个人账本' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '账本描述', example: '记录个人日常收支' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '是否设为默认账本', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
