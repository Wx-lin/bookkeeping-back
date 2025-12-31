import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('记账')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @ApiOperation({
    summary: '创建记账',
    description: '添加一笔新的支出、收入或转账',
  })
  @ApiResponse({ status: 201, description: '记账成功' })
  @Post()
  create(
    @CurrentUser() user: { id: number },
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionService.create(user.id, dto);
  }

  @ApiOperation({
    summary: '获取记账列表',
    description: '分页获取记账记录，支持筛选',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: '页码',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '每页数量',
    type: Number,
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: '交易类型 (EXPENSE/INCOME/TRANSFER)',
    type: String,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: '开始日期 (YYYY-MM-DD)',
    type: String,
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: '结束日期 (YYYY-MM-DD)',
    type: String,
  })
  @ApiResponse({ status: 200, description: '返回记账列表' })
  @Get()
  findAll(
    @CurrentUser() user: { id: number },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.transactionService.findAll(user.id, {
      page,
      limit,
      type,
      startDate,
      endDate,
    });
  }

  @ApiOperation({ summary: '修改记账', description: '修改已有的记账记录' })
  @ApiResponse({ status: 200, description: '修改成功' })
  @Patch(':id')
  update(
    @CurrentUser() user: { id: number },
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionService.update(+id, user.id, dto);
  }

  @ApiOperation({ summary: '删除记账', description: '删除记账记录并回滚余额' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @Delete(':id')
  remove(@CurrentUser() user: { id: number }, @Param('id') id: string) {
    return this.transactionService.remove(+id, user.id);
  }
}
