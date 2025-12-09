import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() createAccountDto: CreateAccountDto) {
    return this.accountService.create(user.id, createAccountDto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.accountService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.accountService.findOne(+id, user.id);
  }
}
