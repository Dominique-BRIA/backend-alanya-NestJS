import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SendMessageDto, GetMessagesDto } from '../dto/messages.dto';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(private prisma: PrismaService) {}

  async getMessages(
    userId: string,
    conversationId: string,
    dto: GetMessagesDto,
  ) {
    // Verify user is participant
    const participation = await this.prisma.participant.findUnique({
      where: { userId_conversationId: { userId, conversationId } },
    });

    if (!participation) {
      throw new NotFoundException('Conversation non trouvee');
    }

    const where: any = { conversationId };

    if (dto.before) {
      where.createdAt = { lt: new Date(dto.before) };
    }

    if (dto.cursor) {
      where.id = { lt: dto.cursor };
    }

    const messages = await this.prisma.message.findMany({
      where,
      take: dto.limit + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            publicNumber: true,
            pseudo: true,
            avatarUrl: true,
          },
        },
        media: true,
        replyTo: {
          include: {
            sender: { select: { id: true, pseudo: true } },
            media: true,
          },
        },
        _count: { select: { reads: true } },
      },
    });

    let nextCursor: string | undefined;
    if (messages.length > dto.limit) {
      const next = messages.pop();
      nextCursor = next?.id;
    }

    return { messages: messages.reverse(), nextCursor };
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    dto: SendMessageDto,
  ) {
    // Verify user is participant
    const participation = await this.prisma.participant.findUnique({
      where: { userId_conversationId: { userId, conversationId } },
    });

    if (!participation) {
      throw new NotFoundException('Conversation non trouvee');
    }

    // Verify media if provided
    if (dto.mediaId) {
      const media = await this.prisma.mediaFile.findUnique({
        where: { id: dto.mediaId },
      });
      if (!media || media.ownerId !== userId) {
        throw new BadRequestException('Media invalide');
      }
    }

    // Verify replyTo if provided
    if (dto.replyToId) {
      const replyTo = await this.prisma.message.findUnique({
        where: { id: dto.replyToId },
      });
      if (!replyTo || replyTo.conversationId !== conversationId) {
        throw new BadRequestException('Message de reponse invalide');
      }
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: dto.content,
        type: dto.type,
        mediaId: dto.mediaId,
        replyToId: dto.replyToId,
      },
      include: {
        sender: {
          select: {
            id: true,
            publicNumber: true,
            pseudo: true,
            avatarUrl: true,
          },
        },
        media: true,
        replyTo: {
          include: {
            sender: { select: { id: true, pseudo: true } },
            media: true,
          },
        },
      },
    });

    // Update conversation updatedAt
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    this.logger.log(`Message sent: ${message.id} in ${conversationId} by ${userId}`);
    return message;
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message non trouve');
    }

    // Only sender can delete
    if (message.senderId !== userId) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres messages');
    }

    await this.prisma.message.delete({ where: { id: messageId } });

    return { message: 'Message supprime' };
  }

  async hideMessage(userId: string, messageId: string) {
    // Soft delete for current user only
    await this.prisma.messageHide.upsert({
      where: { userId_messageId: { userId, messageId } },
      create: { userId, messageId },
      update: {},
    });

    return { message: 'Message masque' };
  }

  async markAsRead(userId: string, conversationId: string, messageId: string) {
    // Verify user is participant
    const participation = await this.prisma.participant.findUnique({
      where: { userId_conversationId: { userId, conversationId } },
    });

    if (!participation) {
      throw new NotFoundException('Conversation non trouvee');
    }

    // Create read receipt
    await this.prisma.messageRead.upsert({
      where: { userId_messageId: { userId, messageId } },
      create: { userId, messageId },
      update: {},
    });

    return { message: 'Lu' };
  }

  async getUnreadCount(userId: string, conversationId: string) {
    const participation = await this.prisma.participant.findUnique({
      where: { userId_conversationId: { userId, conversationId } },
    });

    if (!participation) {
      throw new NotFoundException('Conversation non trouvee');
    }

    // Count messages after last read
    const lastRead = await this.prisma.messageRead.findFirst({
      where: { userId },
      orderBy: { message: { createdAt: 'desc' } },
      include: { message: true },
    });

    const where: any = { conversationId };
    if (lastRead) {
      where.createdAt = { gt: lastRead.message.createdAt };
    }

    const count = await this.prisma.message.count({ where });
    return { unreadCount: count };
  }
}