import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatDto, CreateThreadDto } from '../dto/ai.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.initGenAI();
  }

  private initGenAI() {
    const apiKey = this.configService.get<string>('app.gemini.apiKey');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async getThreads(userId: string) {
    return this.prisma.aiThread.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
      },
    });
  }

  async getThread(userId: string, threadId: string) {
    const thread = await this.prisma.aiThread.findUnique({
      where: { id: threadId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!thread) {
      throw new NotFoundException('Thread non trouve');
    }

    if (thread.userId !== userId) {
      throw new NotFoundException('Thread non trouve');
    }

    return thread;
  }

  async createThread(userId: string, dto: CreateThreadDto) {
    const thread = await this.prisma.aiThread.create({
      data: {
        userId,
        title: dto.title || 'Nouvelle conversation',
      },
    });

    return thread;
  }

  async deleteThread(userId: string, threadId: string) {
    const thread = await this.prisma.aiThread.findUnique({
      where: { id: threadId },
    });

    if (!thread || thread.userId !== userId) {
      throw new NotFoundException('Thread non trouve');
    }

    await this.prisma.aiThread.delete({ where: { id: threadId } });

    return { message: 'Thread supprime' };
  }

  async chat(userId: string, dto: ChatDto) {
    if (!this.genAI) {
      throw new BadRequestException('Service IA non configure');
    }

    const { message, threadId, systemPrompt } = dto;

    let thread;
    if (threadId) {
      thread = await this.getThread(userId, threadId);
    } else {
      thread = await this.prisma.aiThread.create({
        data: {
          userId,
          title: message.slice(0, 50),
        },
      });
    }

    // Save user message
    await this.prisma.aiMessage.create({
      data: {
        threadId: thread.id,
        role: 'user',
        content: message,
      },
    });

    // Prepare conversation history
    const history = await this.prisma.aiMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
      take: 20, // Limit context
    });

    // Generate response
    const model = this.genAI.getGenerativeModel({
      model: this.configService.get<string>('app.gemini.model') || 'gemini-2.5-flash',
    });

    const chat = model.startChat({
      history: history.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
      systemInstruction: systemPrompt || undefined,
    });

    const result = await chat.sendMessage(message);
    const response = result.response.text();

    // Save assistant message
    await this.prisma.aiMessage.create({
      data: {
        threadId: thread.id,
        role: 'model',
        content: response,
      },
    });

    // Update thread timestamp
    await this.prisma.aiThread.update({
      where: { id: thread.id },
      data: { updatedAt: new Date() },
    });

    return {
      threadId: thread.id,
      message: response,
    };
  }
}