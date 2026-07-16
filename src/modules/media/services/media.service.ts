import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { UploadMediaDto, PresignUploadDto } from '../dto/media.dto';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async getPresignedUploadUrl(userId: string, dto: PresignUploadDto) {
    const provider = this.configService.get<string>('app.media.provider');

    if (provider === 'b2') {
      return this.getB2PresignedUrl(userId, dto);
    }

    // Local storage - return upload endpoint info
    const mediaId = crypto.randomUUID();
    const ext = path.extname(dto.filename) || '.bin';
    const key = `uploads/${userId}/${mediaId}${ext}`;

    return {
      mediaId,
      uploadUrl: `/api/media/upload/${mediaId}`,
      method: 'PUT',
      key,
      provider: 'local',
    };
  }

  private async getB2PresignedUrl(userId: string, dto: PresignUploadDto) {
    // This would use @aws-sdk/s3-request-presigner
    // For now, return a placeholder
    const mediaId = crypto.randomUUID();
    const ext = path.extname(dto.filename) || '.bin';
    const keyPrefix = this.configService.get<string>('app.media.b2.keyPrefix') || 'media/';
    const key = `${keyPrefix}uploads/${userId}/${mediaId}${ext}`;

    // TODO: Implement actual B2 presigned URL generation
    this.logger.warn('B2 presigned URL not fully implemented');

    return {
      mediaId,
      uploadUrl: `https://${this.configService.get<string>('app.media.b2.bucket')}.s3.amazonaws.com/${key}`,
      method: 'PUT',
      key,
      provider: 'b2',
    };
  }

  async confirmUpload(userId: string, dto: UploadMediaDto) {
    const provider = this.configService.get<string>('app.media.provider');
    const maxSizeMb = this.configService.get<number>('app.media.maxSizeMb') ?? 50;

    if (dto.size > maxSizeMb * 1024 * 1024) {
      throw new BadRequestException(`Fichier trop volumineux (max ${maxSizeMb}MB)`);
    }

    const media = await this.prisma.mediaFile.create({
      data: {
        ownerId: userId,
        filename: dto.filename,
        mimeType: dto.mimeType,
        size: dto.size,
        conversationId: dto.conversationId,
        provider,
        key: `uploads/${userId}/${crypto.randomUUID()}${path.extname(dto.filename)}`,
      },
    });

    this.logger.log(`Media confirmed: ${media.id} by ${userId}`);
    return media;
  }

  async getMedia(userId: string, mediaId: string) {
    const media = await this.prisma.mediaFile.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new NotFoundException('Media non trouve');
    }

    // Check access: owner or participant in conversation
    if (media.ownerId !== userId && media.conversationId) {
      const participation = await this.prisma.participant.findUnique({
        where: { userId_conversationId: { userId, conversationId: media.conversationId } },
      });
      if (!participation) {
        throw new ForbiddenException('Non autorise');
      }
    } else if (media.ownerId !== userId) {
      throw new ForbiddenException('Non autorise');
    }

    return media;
  }

  async getPresignedDownloadUrl(userId: string, mediaId: string) {
    const media = await this.getMedia(userId, mediaId);

    const provider = this.configService.get<string>('app.media.provider');

    if (provider === 'b2' && media.provider === 'b2') {
      // TODO: Implement B2 presigned download URL
      return {
        downloadUrl: `https://${this.configService.get<string>('app.media.b2.bucket')}.s3.amazonaws.com/${media.key}`,
        expiresIn: this.configService.get<number>('app.media.b2.presignExpiresInSec') ?? 3600,
      };
    }

    // Local storage - serve via endpoint
    return {
      downloadUrl: `/api/media/${mediaId}/download`,
      expiresIn: 3600,
    };
  }

  async deleteMedia(userId: string, mediaId: string) {
    const media = await this.prisma.mediaFile.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new NotFoundException('Media non trouve');
    }

    if (media.ownerId !== userId) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres medias');
    }

    // Delete file from storage
    if (media.provider === 'local') {
      try {
        const storageDir = this.configService.get<string>('app.media.storageDir') ?? './storage/media';
        const filePath = path.join(storageDir, media.key);
        await fs.unlink(filePath);
      } catch (error) {
        this.logger.warn(`Failed to delete local file: ${media.key}`, error);
      }
    }

    await this.prisma.mediaFile.delete({ where: { id: mediaId } });

    return { message: 'Media supprime' };
  }

  async getConversationMedia(userId: string, conversationId: string, limit = 50) {
    // Verify participation
    const participation = await this.prisma.participant.findUnique({
      where: { userId_conversationId: { userId, conversationId } },
    });

    if (!participation) {
      throw new NotFoundException('Conversation non trouvee');
    }

    return this.prisma.mediaFile.findMany({
      where: { conversationId },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }
}