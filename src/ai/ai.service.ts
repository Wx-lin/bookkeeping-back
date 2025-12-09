import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AccountService } from '../account/account.service';
import { CategoryService } from '../category/category.service';
import { TransactionService } from '../transaction/transaction.service';
import { CreateTransactionDto, TransactionType } from '../transaction/dto/create-transaction.dto';

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
      apiKey: this.configService.get<string>('OPENAI_API_KEY') || 'dummy-key-for-local-dev',
    });
  }

  async chat(userId: number, text: string) {
    // 1. Fetch context
    const accounts = await this.accountService.findAll(userId);
    const categories = await this.categoryService.findAll(userId);

    const accountContext = accounts.map(a => `${a.name} (ID: ${a.id})`).join(', ');
    const categoryContext = categories.map(c => `${c.name} (ID: ${c.id}, Type: ${c.type})`).join(', ');

    // 2. Build Prompt
    const prompt = `
    Analyze the following financial transaction text and extract the details into a JSON object.
    
    Context:
    - User's Accounts: ${accountContext}
    - Categories: ${categoryContext}
    - Current Date: ${new Date().toISOString()}
    
    Text: "${text}"
    
    Output JSON format:
    {
      "amount": number,
      "type": "EXPENSE" | "INCOME" | "TRANSFER",
      "accountId": number, // The ID of the source account. If not specified, infer the most likely one or default to the first one.
      "categoryId": number, // Optional, for expense/income.
      "toAccountId": number, // Required for TRANSFER.
      "date": string, // ISO date string. If not specified, use current date.
      "description": string // Brief description of the transaction.
    }
    
    Rules:
    - If account or category is mentioned by name, map to the corresponding ID.
    - If fuzzy match, pick the closest.
    - If transfer, source account is "accountId" and destination is "toAccountId".
    - Only return the JSON object, no markdown formatting.
    `;

    try {
      // 3. Call OpenAI
      const completion = await this.openai.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-3.5-turbo', // Or gpt-4
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new InternalServerErrorException('AI returned empty response');
      }
      // Clean up potential markdown code blocks
      const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
      
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
        aiAnalysis: result
      };

    } catch (error) {
      console.error('AI Error:', error);
      throw new InternalServerErrorException('Failed to process AI request');
    }
  }
}
