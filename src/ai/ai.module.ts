import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { TransactionModule } from '../transaction/transaction.module';
import { AccountModule } from '../account/account.module';
import { CategoryModule } from '../category/category.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [TransactionModule, AccountModule, CategoryModule, ConfigModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
