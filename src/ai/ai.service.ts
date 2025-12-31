import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AccountService } from '../account/account.service';
import { CategoryService } from '../category/category.service';
import { TransactionService } from '../transaction/transaction.service';
import { CreateTransactionDto } from '../transaction/dto/create-transaction.dto';
import { PrismaService } from '../prisma/prisma.service';

// 定义卡片类型枚举
export enum CardType {
  TRANSACTION_CONFIRM = 'transaction_confirm',
}

import { Stream } from 'openai/streaming';
import { ChatCompletionChunk } from 'openai/resources/chat/completions';
import { Account, Category } from '@prisma/client';

// 临时定义 ChatMessage 类型，直到 Prisma 类型同步
interface ChatMessage {
  id: number;
  userId: number;
  role: string;
  content: string;
  hasCard: boolean;
  cardType: string | null;
  cardData: string | null;
  createdAt: Date;
}

// 定义包含 chatMessage 的 Prisma 类型以修复 TS 报错
type ExtendedPrismaService = PrismaService & {
  chatMessage: {
    findMany: (args: any) => Promise<ChatMessage[]>;
    count: (args: any) => Promise<number>;
    create: (args: any) => Promise<ChatMessage>;
  };
};

@Injectable()
export class AiService {
  private openai: OpenAI;
  private extendedPrisma: ExtendedPrismaService;

  constructor(
    private configService: ConfigService,
    private accountService: AccountService,
    private categoryService: CategoryService,
    private transactionService: TransactionService,
    private prisma: PrismaService,
  ) {
    this.openai = new OpenAI({
      apiKey:
        this.configService.get<string>('OPENAI_API_KEY') ||
        'dummy-key-for-local-dev',
      baseURL:
        this.configService.get<string>('OPENAI_BASE_URL') ||
        'https://api.openai.com/v1',
    });
    this.extendedPrisma = this.prisma as unknown as ExtendedPrismaService;
  }

  // 获取聊天记录
  async getHistory(userId: number, limit: number, offset: number) {
    const messages = await this.extendedPrisma.chatMessage.findMany({
      where: { userId },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });

    // 格式化返回（倒序取出来，前端可能需要正序展示，或者前端自己 reverse）
    return {
      items: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        card: msg.hasCard
          ? {
              type: msg.cardType,
              data: msg.cardData
                ? (JSON.parse(msg.cardData) as Record<string, any>)
                : null,
            }
          : null,
        createdAt: msg.createdAt,
      })),
      total: await this.extendedPrisma.chatMessage.count({ where: { userId } }),
    };
  }

  // 流式对话接口
  async chatStream(userId: number, text: string) {
    // 1. 获取上下文
    const accounts = await this.accountService.findAll(userId);
    const categories = await this.categoryService.findAll(userId);

    const accountContext = accounts
      .map((a) => `${a.name} (ID: ${a.id})`)
      .join(', ');
    const categoryContext = categories
      .map((c) => `${c.name} (ID: ${c.id}, Type: ${c.type})`)
      .join(', ');

    const systemPrompt = `
    你是一个智能记账助手。
    当前用户信息:
    - 账户: ${accountContext}
    - 分类: ${categoryContext}
    - 时间: ${new Date().toISOString()}

    能力:
    1. 如果用户想要记账，请提取信息并调用 'create_transaction' 工具。
    2. 如果用户只是闲聊或咨询，请直接用文本回复。
    3. 如果信息不全（如没说金额），请追问用户。
    `;

    // 2. 获取最近历史记录
    const history = await this.extendedPrisma.chatMessage.findMany({
      where: { userId },
      take: 10, // 取最近10条
      orderBy: { createdAt: 'desc' },
    });

    // 3. 构建消息列表 (System + History + User)
    // 历史记录需要倒序（因为查出来是倒序，对话需要正序）
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history.reverse().map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
      { role: 'user', content: text },
    ];

    // 4. 保存用户消息到数据库
    await this.extendedPrisma.chatMessage.create({
      data: { userId, role: 'user', content: text },
    });

    try {
      // 5. 调用 AI (Stream Mode)
      const stream = await this.openai.chat.completions.create({
        model:
          this.configService.get<string>('OPENAI_MODEL_NAME') ||
          'gpt-3.5-turbo',
        messages,
        stream: true,
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_transaction',
              description: '创建一笔交易记录',
              parameters: {
                type: 'object',
                properties: {
                  amount: { type: 'number', description: '金额' },
                  type: {
                    type: 'string',
                    enum: ['EXPENSE', 'INCOME', 'TRANSFER'],
                    description: '交易类型',
                  },
                  accountId: { type: 'number', description: '账户ID' },
                  categoryId: { type: 'number', description: '分类ID' },
                  toAccountId: {
                    type: 'number',
                    description: '转入账户ID (仅转账需要)',
                  },
                  date: { type: 'string', description: '日期 ISO 格式' },
                  description: { type: 'string', description: '描述' },
                },
                required: ['amount', 'type'],
              },
            },
          },
        ],
      });

      return this.handleStream(stream, userId, accounts, categories);
    } catch (error) {
      console.error('AI Stream Error:', error);
      throw new InternalServerErrorException('AI Service Unavailable');
    }
  }

  // 处理流式响应
  private async *handleStream(
    stream: Stream<ChatCompletionChunk>,
    userId: number,
    accounts: Account[],
    categories: Category[],
  ) {
    let fullContent = '';
    let toolCallName = '';
    let toolCallArgs = '';
    let isToolCalling = false;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      // Case A: 普通文本流
      if (delta?.content) {
        fullContent += delta.content;
        yield { type: 'text', content: delta.content };
      }

      // Case B: 工具调用 (Function Calling)
      if (delta?.tool_calls) {
        isToolCalling = true;
        const toolCall = delta.tool_calls[0];
        if (toolCall.function?.name) toolCallName = toolCall.function.name;
        if (toolCall.function?.arguments)
          toolCallArgs += toolCall.function.arguments;
      }
    }

    // 流结束后，处理结果
    if (isToolCalling && toolCallName === 'create_transaction') {
      // 1. 解析参数
      let args: CreateTransactionDto;
      try {
        args = JSON.parse(toolCallArgs) as CreateTransactionDto;
      } catch (error) {
        console.error('Parse Tool Args Error:', error);
        yield { type: 'error', content: '无法解析交易信息' };
        return;
      }

      // 2. 兜底逻辑 (填充默认 ID)
      if (!args.accountId) {
        if (accounts.length > 0) {
          args.accountId = accounts[0].id;
        } else {
          yield {
            type: 'text',
            content: '您还没有创建账户，无法记账。请先创建账户。',
          };
          return;
        }
      }
      if (!args.date) args.date = new Date().toISOString();

      // 3. 执行记账
      try {
        const transaction = await this.transactionService.create(userId, args);

        // 4. 构建卡片数据
        const category = categories.find(
          (c) => c.id === transaction.categoryId,
        );
        const account = accounts.find((a) => a.id === transaction.accountId);

        const cardData = {
          transactionId: transaction.id,
          amount: transaction.amount,
          type: transaction.type,
          categoryName: category?.name || '未知分类',
          accountName: account?.name || '未知账户',
          date: transaction.date,
          description: transaction.description,
          status: 'saved',
        };

        // 5. 保存 AI 回复到数据库 (带卡片)
        await this.extendedPrisma.chatMessage.create({
          data: {
            userId,
            role: 'assistant',
            content: '已为您记账', // 简短文本
            hasCard: true,
            cardType: CardType.TRANSACTION_CONFIRM,
            cardData: JSON.stringify(cardData),
          },
        });

        // 6. 推送卡片给前端
        yield {
          type: 'card',
          cardType: CardType.TRANSACTION_CONFIRM,
          data: cardData,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        yield { type: 'text', content: `记账失败: ${errorMessage}` };
      }
    } else {
      // 普通对话，保存到数据库
      if (fullContent) {
        await this.extendedPrisma.chatMessage.create({
          data: { userId, role: 'assistant', content: fullContent },
        });
      }
    }
  }
}
