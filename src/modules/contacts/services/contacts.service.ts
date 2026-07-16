import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UsersService } from '../../users/services/users.service';
import { AddContactDto, UpdateContactDto } from '../dto/contacts.dto';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  async getContacts(userId: string) {
    const contacts = await this.prisma.contact.findMany({
      where: { userId, isBlocked: false },
      include: {
        contact: {
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
      orderBy: { createdAt: 'desc' },
    });

    return contacts.map((c) => ({
      id: c.id,
      alias: c.alias,
      isBlocked: c.isBlocked,
      createdAt: c.createdAt,
      contact: c.contact,
    }));
  }

  async getBlockedContacts(userId: string) {
    const blocked = await this.prisma.contact.findMany({
      where: { userId, isBlocked: true },
      include: {
        contact: {
          select: {
            id: true,
            publicNumber: true,
            pseudo: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return blocked.map((c) => ({
      id: c.id,
      alias: c.alias,
      isBlocked: c.isBlocked,
      createdAt: c.createdAt,
      contact: c.contact,
    }));
  }

  async addContact(userId: string, dto: AddContactDto) {
    // Find contact by public number
    const contactUser = await this.prisma.user.findUnique({
      where: { publicNumber: dto.contactPublicNumber },
    });

    if (!contactUser) {
      throw new NotFoundException('Utilisateur non trouve');
    }

    if (contactUser.id === userId) {
      throw new BadRequestException('Vous ne pouvez pas vous ajouter vous-meme');
    }

    // Check if already a contact
    const existing = await this.prisma.contact.findUnique({
      where: { userId_contactId: { userId, contactId: contactUser.id } },
    });

    if (existing) {
      if (existing.isBlocked) {
        // Unblock if was blocked
        return this.prisma.contact.update({
          where: { id: existing.id },
          data: { isBlocked: false, alias: dto.alias },
          include: {
            contact: {
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
        });
      }
      throw new ConflictException('Cet utilisateur est deja dans vos contacts');
    }

    const contact = await this.prisma.contact.create({
      data: {
        userId,
        contactId: contactUser.id,
        alias: dto.alias,
      },
      include: {
        contact: {
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
    });

    this.logger.log(`Contact added: ${userId} -> ${contactUser.id}`);
    return contact;
  }

  async updateContact(userId: string, contactId: string, dto: UpdateContactDto) {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact || contact.userId !== userId) {
      throw new NotFoundException('Contact non trouve');
    }

    return this.prisma.contact.update({
      where: { id: contactId },
      data: {
        alias: dto.alias,
        isBlocked: dto.isBlocked,
      },
      include: {
        contact: {
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
    });
  }

  async removeContact(userId: string, contactId: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact || contact.userId !== userId) {
      throw new NotFoundException('Contact non trouve');
    }

    await this.prisma.contact.delete({ where: { id: contactId } });

    this.logger.log(`Contact removed: ${userId} -> ${contact.contactId}`);
    return { message: 'Contact supprime' };
  }

  async blockContact(userId: string, contactId: string) {
    return this.updateContact(userId, contactId, { isBlocked: true });
  }

  async unblockContact(userId: string, contactId: string) {
    return this.updateContact(userId, contactId, { isBlocked: false });
  }
}