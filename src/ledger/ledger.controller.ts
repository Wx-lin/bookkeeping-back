import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LedgerService } from './ledger.service';
import { CreateLedgerDto } from './dto/create-ledger.dto';
import { UpdateLedgerDto } from './dto/update-ledger.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('账本')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ledgers')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Post()
  @ApiOperation({ summary: '创建账本' })
  create(
    @CurrentUser('userId') userId: number,
    @Body() createLedgerDto: CreateLedgerDto,
  ) {
    return this.ledgerService.create(userId, createLedgerDto);
  }

  @Get()
  @ApiOperation({ summary: '获取账本列表' })
  findAll(@CurrentUser('userId') userId: number) {
    return this.ledgerService.findAll(userId);
  }

  @Get('default')
  @ApiOperation({ summary: '获取默认账本' })
  findDefault(@CurrentUser('userId') userId: number) {
    return this.ledgerService.findDefault(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取账本详情' })
  findOne(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ledgerService.findOne(userId, id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: '获取账本统计' })
  getStats(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ledgerService.getStats(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新账本' })
  update(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLedgerDto: UpdateLedgerDto,
  ) {
    return this.ledgerService.update(userId, id, updateLedgerDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除账本' })
  remove(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ledgerService.remove(userId, id);
  }
}
