import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('统计报表')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @ApiOperation({
    summary: '资产概览',
    description: '获取总资产、总负债和净资产',
  })
  @ApiResponse({ status: 200, description: '返回资产统计数据' })
  @Get('assets')
  getAssetsOverview(@CurrentUser() user: { id: number }) {
    return this.statsService.getAssetsOverview(user.id);
  }

  @ApiOperation({
    summary: '收支趋势',
    description: '获取指定时间段内的每日收支趋势',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: '开始日期 (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: '结束日期 (YYYY-MM-DD)',
  })
  @ApiResponse({ status: 200, description: '返回趋势数据' })
  @Get('trend')
  getTrend(
    @CurrentUser() user: { id: number },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.statsService.getTrend(user.id, startDate, endDate);
  }

  @ApiOperation({
    summary: '分类统计',
    description: '获取指定时间段内各分类的收支统计',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: '开始日期 (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: '结束日期 (YYYY-MM-DD)',
  })
  @ApiResponse({ status: 200, description: '返回分类统计数据' })
  @Get('category')
  getCategoryStats(
    @CurrentUser() user: { id: number },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.statsService.getCategoryStats(user.id, startDate, endDate);
  }
}
