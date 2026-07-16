import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ContactsService } from '../../contacts/services/contacts.service';
import { CreateStatusDto, GetStatusesDto } from '../dto/statuses.dto';

@Injectable()
export class StatusesService {
  private readonly logger = new Logger(StatusesService.name);

  constructor(
    private prisma: PrismaService,
    private contactsService: ContactsService,
  ) {}

  async getStatuses(userId: string, dto: GetStatusesDto) {
    // Get user's contacts
    const contacts = await this.prisma.contact.findMany({
      where: { userId, isBlocked: false },
      select: { contactId: true },
    });

    const contactIds = contacts.map((c) => c.contactId);
    contactIds.push(userId); // Include own statuses

    const where: any = {
      userId: { in: contactIds },
      expiresAt: { gt: new Date() },
    };

    if (dto.cursor) {
      where.id = { lt: dto.cursor };
    }

    const statuses = await this.prisma.status.findMany({
      where,
      take: dto.limit + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            publicNumber: true,
            pseudo: true,
            avatarUrl: true,
          },
        },
        _count: { select: { views: true } },
        views: {
          where: { userId },
          select: { id: true },
        },
        media: true,
      },
    });

    let nextCursor: string | undefined;
    if (statuses.length > dto.limit) {
      const next = statuses.pop();
      nextCursor = next?.id;
    }

    return {
      statuses: statuses.map((s) => ({
        ...s,
        viewed: s.views.length > 0,
        viewsCount: s._count.views,
      })),
      nextCursor,
    };
  }

  async getUserStatuses(userId: string, targetUserId: string) {
    // Check if users are contacts or same user
    if (userId !== targetUserId) {
      const contact = await this.prisma.contact.findUnique({
        where: { userId_contactId: { userId, contactId: targetUserId } },
      });
      if (!contact || contact.isBlocked) {
        throw new ForbiddenException('Non autorise');
      }
    }

    const statuses = await this.prisma.status.findMany({
      where: {
        userId: targetUserId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            publicNumber: true,
            pseudo: true,
            avatarUrl: true,
          },
        },
        _count: { select: { views: true } },
        views: {
          where: { userId },
          select: { id: true },
        },
        media: true,
      },
    });

    return statuses.map((s) => ({
      ...s,
      viewed: s.views.length > 0,
      viewsCount: s._count.views,
    }));
  }

  async createStatus(userId: string, dto: CreateStatusDto) {
    const { content, mediaId, type, backgroundColor } = dto;

    if (!content && !mediaId) {
      throw new BadRequestException('Contenu ou media requis');
    }

    if (mediaId) {
      const media = await this.prisma.mediaFile.findUnique({
        where: { id: mediaId },
      });
      if (!media || media.ownerId !== userId) {
        throw new BadRequestException('Media invalide');
      }
    }

    // Expires in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const status = await this.prisma.status.create({
      data: {
        userId,
        content,
        mediaId,
        type,
        backgroundColor,
        expiresAt,
      },
      include: {
        user: {
          select: {
            id: true,
            publicNumber: true,
            pseudo: true,
            avatarUrl: true,
          },
        },
        media: true,
      },
    });

    this.logger.log(`Status created: ${status.id} by ${userId}`);
    return status;
  }

  async deleteStatus(userId: string, statusId: string) {
    const status = await this.prisma.status.findUnique({
      where: { id: statusId },
    });

    if (!status) {
      throw new NotFoundException('Status non trouve');
    }

    if (status.userId !== userId) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres statuts');
    }

    await this.prisma.status.delete({ where: { id: statusId } });

    return { message: 'Status supprime' };
  }

  async viewStatus(userId: string, statusId: string) {
    const status = await this.prisma.status.findUnique({
      where: { id: statusId },
    });

    if (!status) {
      throw new NotFoundException('Status non trouve');
    }

    // Check if user can view (contact or own)
    if (status.userId !== userId) {
      const contact = await this.prisma.contact.findUnique({
        where: { userId_contactId: { userId, contactId: status.userId } },
      });
      if (!contact || contact.isBlocked) {
        throw new ForbiddenException('Non autorise');
      }
    }

    // Check if expired
    if (status.expiresAt < new Date()) {
      throw new BadRequestException('Status expire');
    }

    // Create view record
    await this.prisma.statusView.upsert({
      where: { statusId_userId: { statusId, userId } },
      create: { userId, statusId },
      update: {},
    });

    return { message: 'Vu' };
  }

  async getStatusViews(userId: string, statusId: string) {
    const status = await this.prisma.status.findUnique({
      where: { id: statusId },
    });

    if (!status) {
      throw new NotFoundException('Status non trouve');
    }

    if (status.userId !== userId) {
      throw new ForbiddenException('Seul l\'auteur peut voir les vues');
    }

    const views = await this.prisma.statusView.findMany({
      where: { statusId },
      include: {
        user: {
          select: {
            id: true,
            publicNumber: true,
            pseudo: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { viewedAt: 'desc' },
    });

    return views;
  }
}