import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiQuery } from '@nestjs/swagger';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('账户')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @ApiOperation({ summary: '创建账户', description: '创建一个新的资产账户' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @Post()
  create(
    @CurrentUser() user: { id: number },
    @Body() createAccountDto: CreateAccountDto,
  ) {
    return this.accountService.create(user.id, createAccountDto);
  }

  @ApiOperation({
    summary: '获取账户列表',
    description: '获取当前用户的所有账户',
  })
  @ApiQuery({ name: 'ledgerId', required: false, description: '账本ID，不传则返回所有账户' })
  @ApiResponse({ status: 200, description: '返回账户列表' })
  @Get()
  findAll(
    @CurrentUser() user: { id: number },
    @Query('ledgerId', new ParseIntPipe({ optional: true })) ledgerId?: number,
  ) {
    return this.accountService.findAll(user.id, ledgerId);
  }

  @ApiOperation({
    summary: '获取账户详情',
    description: '根据 ID 获取账户详情',
  })
  @ApiResponse({ status: 200, description: '返回账户详情' })
  @Get(':id')
  findOne(
    @CurrentUser() user: { id: number },
    @Param('id') id: string,
    @Query('ledgerId', new ParseIntPipe({ optional: true })) ledgerId?: number,
  ) {
    return this.accountService.findOne(+id, user.id, ledgerId);
  }

  @ApiOperation({ summary: '更新账户', description: '更新账户信息' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @Patch(':id')
  update(
    @CurrentUser() user: { id: number },
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountService.update(+id, user.id, dto);
  }

  @ApiOperation({ summary: '删除账户', description: '删除账户（有交易则归档）' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @Delete(':id')
  remove(
    @CurrentUser() user: { id: number },
    @Param('id') id: string,
  ) {
    return this.accountService.remove(+id, user.id);
  }

  @ApiOperation({ summary: '更新排序', description: '更新账户排序顺序' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @Patch(':id/sort')
  updateSortOrder(
    @CurrentUser() user: { id: number },
    @Param('id') id: string,
    @Body('sortOrder', ParseIntPipe) sortOrder: number,
  ) {
    return this.accountService.updateSortOrder(+id, user.id, sortOrder);
  }
}
