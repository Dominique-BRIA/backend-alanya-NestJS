import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateProfileDto, SearchUsersDto, PublicNumberDto } from '../dto/users.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        publicNumber: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        nom: true,
        idPays: true,
        typeCompte: true,
        pseudo: true,
        avatarUrl: true,
        statusMsg: true,
        lastSeen: true,
        isOnline: true,
        pays: {
          select: {
            idPays: true,
            libelle: true,
            prefix: true,
            timeZone: true,
            decalageHoraire: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Check pseudo uniqueness if provided
    if (dto.pseudo) {
      const existing = await this.prisma.user.findFirst({
        where: { pseudo: dto.pseudo },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException('Ce pseudo est déjà pris');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        pseudo: dto.pseudo,
        avatarUrl: dto.avatarUrl,
        statusMsg: dto.statusMsg,
        nom: dto.nom,
        idPays: dto.idPays,
      },
      select: {
        id: true,
        email: true,
        publicNumber: true,
        nom: true,
        idPays: true,
        pseudo: true,
        avatarUrl: true,
        statusMsg: true,
        pays: {
          select: {
            idPays: true,
            libelle: true,
            prefix: true,
            timeZone: true,
            decalageHoraire: true,
          },
        },
      },
    });

    this.logger.log(`Profile updated for user: ${userId}`);
    return user;
  }

  async searchUsers(currentUserId: string, dto: SearchUsersDto) {
    const { q, limit, cursor } = dto;

    const where: any = {
      id: { not: currentUserId },
      emailVerified: true,
    };

    if (q) {
      where.OR = [
        { pseudo: { contains: q, mode: 'insensitive' } },
        { publicNumber: { contains: q } },
        { email: { contains: q, mode: 'insensitive' } },
        { nom: { contains: q, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        publicNumber: true,
        pseudo: true,
        avatarUrl: true,
        statusMsg: true,
        isOnline: true,
        lastSeen: true,
      },
    });

    let nextCursor: string | undefined;
    if (users.length > limit) {
      const nextUser = users.pop();
      nextCursor = nextUser!.id;
    }

    return { users, nextCursor };
  }

  async getUserByPublicNumber(dto: PublicNumberDto) {
    const user = await this.prisma.user.findUnique({
      where: { publicNumber: dto.publicNumber },
      select: {
        id: true,
        publicNumber: true,
        pseudo: true,
        avatarUrl: true,
        statusMsg: true,
        isOnline: true,
        lastSeen: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return user;
  }

  async updateOnlineStatus(userId: string, isOnline: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isOnline: isOnline ? 1 : 0,
        lastSeen: isOnline ? null : new Date(),
      },
    });
  }

  async updateLastSeen(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastSeen: new Date() },
    });
  }
}