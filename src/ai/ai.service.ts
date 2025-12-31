import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AccountService } from '../account/account.service';
import { CategoryService } from '../category/category.service';
import { TransactionService } from '../transaction/transaction.service';
import { CreateTransactionDto } from '../transaction/dto/create-transaction.dto';

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(
    private configService: ConfigService,
    private accountService: AccountService,
    private categoryService: CategoryService,
    private transactionService: TransactionService,
  ) {
    this.openai = new OpenAI({
      apiKey:
        this.configService.get<string>('OPENAI_API_KEY') ||
        'dummy-key-for-local-dev',
    });
  }

  async chat(userId: number, text: string) {
    // 1. Fetch context
    const accounts = await this.accountService.findAll(userId);
    const categories = await this.categoryService.findAll(userId);

    const accountContext = accounts
      .map((a) => `${a.name} (ID: ${a.id})`)
      .join(', ');
    const categoryContext = categories
      .map((c) => `${c.name} (ID: ${c.id}, Type: ${c.type})`)
      .join(', ');

    // 2. Build Prompt
    const prompt = `
    请分析以下财务交易文本，并提取关键信息输出为 JSON 对象。
    
    上下文信息:
    - 用户账户列表: ${accountContext}
    - 消费分类列表: ${categoryContext}
    - 当前时间: ${new Date().toISOString()}
    
    交易文本: "${text}"
    
    请严格按照以下 JSON 格式输出:
    {
      "amount": number,
      "type": "EXPENSE" (支出) | "INCOME" (收入) | "TRANSFER" (转账),
      "accountId": number, // 来源账户ID。如果未指定，请根据语境推断或默认使用第一个账户。
      "categoryId": number, // 分类ID (支出/收入必填)。
      "toAccountId": number, // 目标账户ID (转账必填)。
      "date": string, // ISO 日期字符串。如果未指定，使用当前时间。
      "description": string // 交易简短描述。
    }
    
    规则:
    1. 如果文本中提到了账户或分类名称，请映射到对应的 ID。
    2. 支持模糊匹配，选择最接近的选项。
    3. 如果是转账，"accountId" 是转出账户，"toAccountId" 是转入账户。
    4. 仅返回 JSON 对象，不要包含 markdown 格式化标记 (如 \`\`\`json)。
    `;

    try {
      // 3. Call AI
      const completion = await this.openai.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model:
          this.configService.get<string>('OPENAI_MODEL_NAME') ||
          'gpt-3.5-turbo',
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new InternalServerErrorException('AI returned empty response');
      }
      // Clean up potential markdown code blocks
      const cleanContent = content
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      const result = JSON.parse(cleanContent) as CreateTransactionDto;

      // 4. Create Transaction
      // Basic validation or fallback if AI misses ID
      if (!result.accountId && accounts.length > 0) {
        result.accountId = accounts[0].id;
      }

      const transaction = await this.transactionService.create(userId, result);

      return {
        message: 'Transaction recorded successfully',
        transaction,
        aiAnalysis: result,
      };
    } catch (error) {
      console.error('AI Processing Error:', error);
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to process AI request: ${(error as Error).message}`,
      );
    }
  }
}
