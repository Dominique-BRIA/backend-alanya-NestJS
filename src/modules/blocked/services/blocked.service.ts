import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BlockUserDto } from '../dto/blocked.dto';

@Injectable()
export class BlockedService {
  private readonly logger = new Logger(BlockedService.name);

  constructor(private prisma: PrismaService) {}

  async getBlockedUsers(userId: string) {
    const blocked = await this.prisma.blocked.findMany({
      where: { alanyaID: userId },
      include: {
        blockedUser: {
          select: {
            id: true,
            publicNumber: true,
            pseudo: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { dateBlock: 'desc' },
    });

    return blocked.map((b) => ({
      id: b.idBlock,
      dateBlock: b.dateBlock,
      user: b.blockedUser,
    }));
  }

  async blockUser(userId: string, dto: BlockUserDto) {
    const { targetUserId } = dto;

    if (targetUserId === userId) {
      throw new BadRequestException('Vous ne pouvez pas vous bloquer vous-meme');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('Utilisateur non trouve');
    }

    // Check if already blocked
    const existing = await this.prisma.blocked.findUnique({
      where: { alanyaID_idCallerBlock: { alanyaID: userId, idCallerBlock: targetUserId } },
    });

    if (existing) {
      throw new ConflictException('Cet utilisateur est deja bloque');
    }

    const blocked = await this.prisma.blocked.create({
      data: {
        alanyaID: userId,
        idCallerBlock: targetUserId,
      },
      include: {
        blockedUser: {
          select: {
            id: true,
            publicNumber: true,
            pseudo: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Also block in contacts if exists
    await this.prisma.contact.updateMany({
      where: { userId, contactId: targetUserId },
      data: { isBlocked: true },
    });

    this.logger.log(`User blocked: ${userId} -> ${targetUserId}`);
    return blocked;
  }

  async unblockUser(userId: string, blockedId: string) {
    const blocked = await this.prisma.blocked.findUnique({
      where: { idBlock: parseInt(blockedId, 10) },
    });

    if (!blocked || blocked.alanyaID !== userId) {
      throw new NotFoundException('Blocage non trouve');
    }

    await this.prisma.blocked.delete({ where: { idBlock: blocked.idBlock } });

    // Also unblock in contacts
    await this.prisma.contact.updateMany({
      where: { userId, contactId: blocked.idCallerBlock },
      data: { isBlocked: false },
    });

    this.logger.log(`User unblocked: ${userId} -> ${blocked.idCallerBlock}`);
    return { message: 'Utilisateur debloque' };
  }

  async isBlocked(userId: string, targetUserId: string): Promise<boolean> {
    const blocked = await this.prisma.blocked.findUnique({
      where: { alanyaID_idCallerBlock: { alanyaID: userId, idCallerBlock: targetUserId } },
    });
    return !!blocked;
  }

  async isBlockedBy(userId: string, targetUserId: string): Promise<boolean> {
    const blocked = await this.prisma.blocked.findUnique({
      where: { alanyaID_idCallerBlock: { alanyaID: targetUserId, idCallerBlock: userId } },
    });
    return !!blocked;
  }
}