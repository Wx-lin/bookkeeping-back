import { IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';

  @IsString()
  @IsOptional()
  icon?: string;
}

