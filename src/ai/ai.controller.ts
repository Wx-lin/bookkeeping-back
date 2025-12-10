import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('AI 智能助手')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @ApiOperation({ summary: 'AI 智能记账', description: '发送自然语言文本，AI 自动解析并尝试记账' })
  @ApiResponse({ status: 201, description: '解析成功并记账', type: String })
  @Post('chat')
  chat(@CurrentUser() user: any, @Body() dto: ChatDto) {
    return this.aiService.chat(user.id, dto.text);
  }
}
