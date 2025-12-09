import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('assets')
  getAssetsOverview(@CurrentUser() user: any) {
    return this.statsService.getAssetsOverview(user.id);
  }

  @Get('trend')
  getTrend(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.statsService.getTrend(user.id, startDate, endDate);
  }

  @Get('category')
  getCategoryStats(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.statsService.getCategoryStats(user.id, startDate, endDate);
  }
}
