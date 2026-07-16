import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConversationsService } from '../../conversations/services/conversations.service';
import { PushService } from '../../push/services/push.service';
import { InitiateCallDto, CallActionDto } from '../dto/calls.dto';

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);

  constructor(
    private prisma: PrismaService,
    private conversationsService: ConversationsService,
    private pushService: PushService,
  ) {}

  async initiateCall(userId: string, dto: InitiateCallDto) {
    const { conversationId, type, targetUserId } = dto;

    // Verify user is participant
    const participation = await this.prisma.participant.findUnique({
      where: { userId_conversationId: { userId, conversationId } },
    });

    if (!participation) {
      throw new NotFoundException('Conversation non trouvee');
    }

    // Verify target is participant
    const targetParticipation = await this.prisma.participant.findUnique({
      where: { userId_conversationId: { userId: targetUserId, conversationId } },
    });

    if (!targetParticipation) {
      throw new NotFoundException('Destinataire non trouve dans la conversation');
    }

    // Check for existing active call
    const existingCall = await this.prisma.call.findFirst({
      where: {
        conversationId,
        status: { in: ['RINGING', 'ONGOING'] },
      },
    });

    if (existingCall) {
      throw new BadRequestException('Un appel est deja en cours dans cette conversation');
    }

    const call = await this.prisma.call.create({
      data: {
        conversationId,
        initiatorId: userId,
        type: type === 'video' ? 2 : 1,
        status: 'RINGING',
        participants: {
          create: [
            { userId, status: 'CONNECTED' },
            { userId: targetUserId, status: 'RINGING' },
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, pseudo: true, avatarUrl: true },
            },
          },
        },
      },
    });

    // Send push notification to target
    await this.pushService.sendIncomingCall(targetUserId, {
      callId: call.id,
      conversationId,
      initiatorId: userId,
      type,
    });

    // Emit WebSocket event (will be handled by gateway)
    this.logger.log(`Call initiated: ${call.id} by ${userId} to ${targetUserId}`);
    return call;
  }

  async handleCallAction(userId: string, dto: CallActionDto) {
    const { callId, action, sdp, iceCandidates } = dto;

    const call = await this.prisma.call.findUnique({
      where: { id: callId },
      include: { participants: true },
    });

    if (!call) {
      throw new NotFoundException('Appel non trouve');
    }

    const participation = call.participants.find((p) => p.userId === userId);
    if (!participation) {
      throw new ForbiddenException('Vous ne participez pas a cet appel');
    }

    switch (action) {
      case 'accept':
        if (participation.status !== 'RINGING') {
          throw new BadRequestException('Impossible d\'accepter cet appel');
        }
        await this.prisma.callParticipant.update({
          where: { id: participation.id },
          data: { status: 'CONNECTED', connectedAt: new Date() },
        });
        await this.prisma.call.update({
          where: { id: callId },
          data: { status: 'ONGOING', startedAt: new Date() },
        });
        break;

      case 'decline':
        await this.prisma.callParticipant.update({
          where: { id: participation.id },
          data: { status: 'DECLINED' },
        });
        await this.endCall(callId, 'DECLINED');
        break;

      case 'end':
        await this.endCall(callId, 'ENDED');
        break;
    }

    // Handle WebRTC signaling data
    if (sdp || iceCandidates) {
      await this.prisma.call.update({
        where: { id: callId },
        data: {
          sdp: sdp ?? undefined,
          iceCandidates: iceCandidates ?? undefined,
        },
      });
    }

    return { action, callId };
  }

  async getCall(userId: string, callId: string) {
    const call = await this.prisma.call.findUnique({
      where: { id: callId },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, pseudo: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!call) {
      throw new NotFoundException('Appel non trouve');
    }

    const isParticipant = call.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      throw new ForbiddenException('Vous ne participez pas a cet appel');
    }

    return call;
  }

  async getCallHistory(userId: string, limit = 20, cursor?: string) {
    const participations = await this.prisma.callParticipant.findMany({
      where: { userId },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { call: { createdAt: 'desc' } },
      include: {
        call: {
          include: {
            participants: {
              include: {
                user: {
                  select: { id: true, pseudo: true, avatarUrl: true },
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
      nextCursor = next?.id;
    }

    return {
      calls: participations.map((p) => p.call),
      nextCursor,
    };
  }

  private async endCall(callId: string, status: 'ENDED' | 'DECLINED' | 'MISSED') {
    await this.prisma.call.update({
      where: { id: callId },
      data: { status, endedAt: new Date() },
    });
  }
}