import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChatDto {
  @ApiProperty({
    description: '自然语言文本',
    example: '今天中午吃黄焖鸡花了25元，用微信支付',
  })
  @IsString()
  @IsNotEmpty()
  text: string;
}
