import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatBotMessage } from '@prisma/client';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class ChatBotService {
  constructor(
    private httpService: HttpService,
    private prisma: PrismaService,
  ) {}

  async askQuestion(question: string): Promise<ChatBotMessage> {
    const response = await this.httpService
      .post('http://127.0.0.1:8000', { promptstr: question })
      .toPromise();

    const answer = response.data.result;
    const usedChunks = response.data.usedChunks;

    const message = await this.prisma.chatBotMessage.create({
      data: {
        question,
        answer,
        isBot: true,
        usedChunks,
      },
    });

    return message;
  }
}
