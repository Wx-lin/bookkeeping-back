import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
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
  @ApiResponse({ status: 200, description: '返回账户列表' })
  @Get()
  findAll(@CurrentUser() user: { id: number }) {
    return this.accountService.findAll(user.id);
  }

  @ApiOperation({
    summary: '获取账户详情',
    description: '根据 ID 获取账户详情',
  })
  @ApiResponse({ status: 200, description: '返回账户详情' })
  @Get(':id')
  findOne(@CurrentUser() user: { id: number }, @Param('id') id: string) {
    return this.accountService.findOne(+id, user.id);
  }
}
