import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { User } from '@prisma/client';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('AI 智能助手')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @ApiOperation({
    summary: '获取聊天记录',
    description: '分页获取用户的聊天记录',
  })
  @Get('history')
  getHistory(
    @CurrentUser() user: User,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    return this.aiService.getHistory(user.id, +limit, +offset);
  }

  @ApiOperation({
    summary: 'AI 智能对话 (流式)',
    description: '支持流式输出 (SSE)，自动识别记账意图',
  })
  @Post('chat/stream')
  async chatStream(
    @CurrentUser() user: User,
    @Body() dto: ChatDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const stream = await this.aiService.chatStream(user.id, dto.text);

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      res.end();
    } catch (error) {
      console.error('Chat Stream Error:', error);
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          content: '服务暂时不可用',
        })}\n\n`,
      );
      res.end();
    }
  }
}
