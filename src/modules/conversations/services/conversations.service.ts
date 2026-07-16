import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateConversationDto,
  UpdateConversationDto,
  AddParticipantsDto,
} from '../dto/conversations.dto';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(private prisma: PrismaService) {}

  async getConversations(userId: string, limit = 50, cursor?: string) {
    const participations = await this.prisma.participant.findMany({
      where: { userId },
      take: limit + 1,
      cursor: cursor ? { userId_conversationId: { userId, conversationId: cursor } } : undefined,
      orderBy: { conversation: { updatedAt: 'desc' } },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    publicNumber: true,
                    pseudo: true,
                    avatarUrl: true,
                    statusMsg: true,
                    isOnline: true,
                    lastSeen: true,
                  },
                },
              },
            },
            _count: { select: { messages: true } },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              include: {
                sender: {
                  select: { id: true, pseudo: true },
                },
              },
            },
          },
        },
      },
    });

    let nextCursor: string | undefined;
    if (participations.length > limit) {
      const next = participations.pop();
      nextCursor = next?.conversationId;
    }

    return {
      conversations: participations.map((p) => ({
        ...p.conversation,
        myRole: p.role,
        unreadCount: 0, // TODO: implement unread count
      })),
      nextCursor,
    };
  }

  async getConversation(userId: string, conversationId: string) {
    const participation = await this.prisma.participant.findUnique({
      where: { userId_conversationId: { userId, conversationId } },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    publicNumber: true,
                    pseudo: true,
                    avatarUrl: true,
                    statusMsg: true,
                    isOnline: true,
                    lastSeen: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!participation) {
      throw new NotFoundException('Conversation non trouvee');
    }

    return {
      ...participation.conversation,
      myRole: participation.role,
    };
  }

  async createConversation(userId: string, dto: CreateConversationDto) {
    const { isGroup, name, participantIds, avatarUrl } = dto;

    // Validate participants
    const participants = await this.prisma.user.findMany({
      where: { id: { in: participantIds } },
    });

    if (participants.length !== participantIds.length) {
      throw new BadRequestException('Un ou plusieurs participants introuvables');
    }

    if (!isGroup && participantIds.length !== 1) {
      throw new BadRequestException('Une conversation directe doit avoir exactement 1 participant');
    }

    if (isGroup && !name) {
      throw new BadRequestException('Un nom est requis pour une conversation de groupe');
    }

    // Check if direct conversation already exists
    if (!isGroup) {
      const existing = await this.findDirectConversation(userId, participantIds[0]);
      if (existing) {
        return this.getConversation(userId, existing.id);
      }
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        isGroup,
        name: isGroup ? name : null,
        avatarUrl,
        participants: {
          create: [
            { userId, role: 'ADMIN' as const },
            ...participantIds.filter((id) => id !== userId).map((id) => ({
              userId: id,
              role: 'MEMBER' as const,
            })),
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                publicNumber: true,
                pseudo: true,
                avatarUrl: true,
                statusMsg: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(`Conversation created: ${conversation.id} by ${userId}`);
    return conversation;
  }

  async updateConversation(
    userId: string,
    conversationId: string,
    dto: UpdateConversationDto,
  ) {
    const participation = await this.prisma.participant.findUnique({
      where: { userId_conversationId: { userId, conversationId } },
    });

    if (!participation) {
      throw new NotFoundException('Conversation non trouvee');
    }

    if (participation.role !== 'ADMIN') {
      throw new ForbiddenException('Seuls les administrateurs peuvent modifier la conversation');
    }

    const conversation = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        name: dto.name,
        avatarUrl: dto.avatarUrl,
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                publicNumber: true,
                pseudo: true,
                avatarUrl: true,
                statusMsg: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
      },
    });

    return conversation;
  }

  async addParticipants(
    userId: string,
    conversationId: string,
    dto: AddParticipantsDto,
  ) {
    const participation = await this.prisma.participant.findUnique({
      where: { userId_conversationId: { userId, conversationId } },
    });

    if (!participation) {
      throw new NotFoundException('Conversation non trouvee');
    }

    if (participation.role !== 'ADMIN') {
      throw new ForbiddenException('Seuls les administrateurs peuvent ajouter des participants');
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation?.isGroup) {
      throw new BadRequestException('Impossible d\'ajouter des participants a une conversation directe');
    }

    // Add new participants
    const newParticipants = await Promise.all(
      dto.participantIds.map((id) =>
        this.prisma.participant.create({
          data: { userId: id, conversationId, role: 'MEMBER' },
          include: {
            user: {
              select: {
                id: true,
                publicNumber: true,
                pseudo: true,
                avatarUrl: true,
                statusMsg: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        }),
      ),
    );

    return newParticipants;
  }

  async removeParticipant(
    userId: string,
    conversationId: string,
    targetUserId: string,
  ) {
    const participation = await this.prisma.participant.findUnique({
      where: { userId_conversationId: { userId, conversationId } },
    });

    if (!participation) {
      throw new NotFoundException('Conversation non trouvee');
    }

    const targetParticipation = await this.prisma.participant.findUnique({
      where: { userId_conversationId: { userId: targetUserId, conversationId } },
    });

    if (!targetParticipation) {
      throw new NotFoundException('Participant non trouve');
    }

    // Can remove self, or if admin removing other
    if (targetUserId !== userId && participation.role !== 'ADMIN') {
      throw new ForbiddenException('Seuls les administrateurs peuvent retirer des participants');
    }

    await this.prisma.participant.delete({
      where: { userId_conversationId: { userId: targetUserId, conversationId } },
    });

    // If last participant, delete conversation
    const remaining = await this.prisma.participant.count({
      where: { conversationId },
    });

    if (remaining === 0) {
      await this.prisma.conversation.delete({ where: { id: conversationId } });
    }

    return { message: 'Participant retire' };
  }

  async leaveConversation(userId: string, conversationId: string) {
    return this.removeParticipant(userId, conversationId, userId);
  }

  private async findDirectConversation(userId1: string, userId2: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        isGroup: false,
        participants: {
          every: { userId: { in: [userId1, userId2] } },
        },
      },
      include: {
        participants: true,
      },
    });

    return conversations.find(
      (c) => c.participants.length === 2 &&
        c.participants.some((p) => p.userId === userId1) &&
        c.participants.some((p) => p.userId === userId2),
    ) || null;
  }
}