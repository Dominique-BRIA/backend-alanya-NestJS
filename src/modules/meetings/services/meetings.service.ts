import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PushService } from '../../push/services/push.service';
import { CreateMeetingDto, UpdateMeetingDto, ParticipantActionDto } from '../dto/meetings.dto';

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  constructor(
    private prisma: PrismaService,
    private pushService: PushService,
  ) {}

  async getMeetings(userId: string, limit = 20, cursor?: number) {
    const participations = await this.prisma.meetingParticipant.findMany({
      where: { IDparticipant: userId },
      take: limit + 1,
      cursor: cursor ? { ID: cursor } : undefined,
      orderBy: { meeting: { start_time: 'desc' } },
      include: {
        meeting: {
          include: {
            organiser: {
              select: { id: true, pseudo: true, avatarUrl: true },
            },
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

    let nextCursor: number | undefined;
    if (participations.length > limit) {
      const next = participations.pop();
      nextCursor = next?.ID;
    }

    return {
      meetings: participations.map((p) => ({
        ...p.meeting,
        myStatus: p.status,
        myConnecte: p.connecte,
      })),
      nextCursor,
    };
  }

  async getMeeting(userId: string, meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { idMeeting: meetingId },
      include: {
        organiser: {
          select: { id: true, pseudo: true, avatarUrl: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, pseudo: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!meeting) {
      throw new NotFoundException('Reunion non trouvee');
    }

    const isParticipant = meeting.participants.some((p) => p.IDparticipant === userId);
    const isOrganiser = meeting.idOrganiser === userId;

    if (!isParticipant && !isOrganiser) {
      throw new ForbiddenException('Vous ne participez pas a cette reunion');
    }

    return meeting;
  }

  async createMeeting(userId: string, dto: CreateMeetingDto) {
    const { startTime, duree, objet, room, typeMedia, participantIds } = dto;

    // Verify participants exist
    const participants = await this.prisma.user.findMany({
      where: { id: { in: participantIds } },
    });

    if (participants.length !== participantIds.length) {
      throw new BadRequestException('Un ou plusieurs participants introuvables');
    }

    const meeting = await this.prisma.meeting.create({
      data: {
        idOrganiser: userId,
        start_time: new Date(startTime),
        duree,
        objet,
        room,
        isEnd: 0,
        type_media: typeMedia === 'video' ? 2 : 1,
        participants: {
          create: participantIds.map((id) => ({
            IDparticipant: id,
            status: id === userId ? 1 : 0, // organiser auto-accepted
            connecte: 0,
          })),
        },
      },
      include: {
        organiser: { select: { id: true, pseudo: true, avatarUrl: true } },
        participants: {
          include: { user: { select: { id: true, pseudo: true, avatarUrl: true } } },
        },
      },
    });

    // Send push notifications to participants
    for (const participantId of participantIds) {
      if (participantId !== userId) {
        await this.pushService.sendMeetingInvitation(participantId, {
          meetingId: meeting.idMeeting,
          organiserId: userId,
          objet: meeting.objet,
          startTime: meeting.start_time,
        });
      }
    }

    this.logger.log(`Meeting created: ${meeting.idMeeting} by ${userId}`);
    return meeting;
  }

  async updateMeeting(userId: string, meetingId: number, dto: UpdateMeetingDto) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { idMeeting: meetingId },
    });

    if (!meeting) {
      throw new NotFoundException('Reunion non trouvee');
    }

    if (meeting.idOrganiser !== userId) {
      throw new ForbiddenException('Seul l\'organisateur peut modifier la reunion');
    }

    const updated = await this.prisma.meeting.update({
      where: { idMeeting: meetingId },
      data: {
        start_time: dto.startTime ? new Date(dto.startTime) : undefined,
        duree: dto.duree,
        objet: dto.objet,
        room: dto.room,
        type_media: dto.typeMedia ? (dto.typeMedia === 'video' ? 2 : 1) : undefined,
        isEnd: dto.isEnd ? 1 : 0,
      },
      include: {
        organiser: { select: { id: true, pseudo: true, avatarUrl: true } },
        participants: {
          include: { user: { select: { id: true, pseudo: true, avatarUrl: true } } },
        },
      },
    });

    return updated;
  }

  async deleteMeeting(userId: string, meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { idMeeting: meetingId },
    });

    if (!meeting) {
      throw new NotFoundException('Reunion non trouvee');
    }

    if (meeting.idOrganiser !== userId) {
      throw new ForbiddenException('Seul l\'organisateur peut supprimer la reunion');
    }

    await this.prisma.meeting.delete({ where: { idMeeting: meetingId } });

    return { message: 'Reunion supprimee' };
  }

  async updateParticipantStatus(userId: string, meetingId: number, dto: ParticipantActionDto) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { idMeeting: meetingId },
      include: { participants: true },
    });

    if (!meeting) {
      throw new NotFoundException('Reunion non trouvee');
    }

    const participation = meeting.participants.find(
      (p) => p.IDparticipant === dto.participantId,
    );

    if (!participation) {
      throw new NotFoundException('Participant non trouve');
    }

    // Only the participant themselves or organiser can update
    if (dto.participantId !== userId && meeting.idOrganiser !== userId) {
      throw new ForbiddenException('Non autorise');
    }

    const updated = await this.prisma.meetingParticipant.update({
      where: { ID: participation.ID },
      data: { status: dto.status === 'accepted' ? 1 : dto.status === 'declined' ? 2 : 0 },
    });

    return updated;
  }

  async updateConnectionStatus(userId: string, meetingId: number, connected: boolean) {
    const participation = await this.prisma.meetingParticipant.findFirst({
      where: { idMeeting: meetingId, IDparticipant: userId },
    });

    if (!participation) {
      throw new NotFoundException('Vous ne participez pas a cette reunion');
    }

    return this.prisma.meetingParticipant.update({
      where: { ID: participation.ID },
      data: { connecte: connected ? 1 : 0, start_time: connected ? new Date() : undefined },
    });
  }
}