import {
  Injectable,
  Logger,
  OnModuleInit,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import * as firebaseAdmin from 'firebase-admin';
import { RegisterDeviceDto } from '../dto/push.dto';

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private firebaseApp: firebaseAdmin.app.App | null = null;
  private messaging: firebaseAdmin.messaging.Messaging | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    this.initFirebase();
  }

  private initFirebase() {
    const serviceAccountBase64 = this.configService.get<string>(
      'app.firebase.serviceAccountBase64',
    );

    if (serviceAccountBase64) {
      try {
        const serviceAccount = JSON.parse(
          Buffer.from(serviceAccountBase64, 'base64').toString('utf-8'),
        );
        this.firebaseApp = firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.cert(serviceAccount),
        });
        this.messaging = this.firebaseApp.messaging();
        this.logger.log('Firebase Admin initialized for push notifications');
      } catch (error) {
        this.logger.error('Failed to initialize Firebase Admin', error);
      }
    }
  }

  async registerDevice(userId: string, dto: RegisterDeviceDto) {
    const { token, platform } = dto;

    // Upsert device
    const device = await this.prisma.pushDevice.upsert({
      where: { token },
      create: {
        userId,
        token,
        platform,
      },
      update: {
        userId,
        platform,
      },
    });

    this.logger.log(`Push device registered: ${device.id} for user ${userId}`);
    return device;
  }

  async unregisterDevice(userId: string, deviceId: string) {
    const device = await this.prisma.pushDevice.findUnique({
      where: { id: deviceId },
    });

    if (!device || device.userId !== userId) {
      throw new NotFoundException('Device non trouve');
    }

    await this.prisma.pushDevice.delete({ where: { id: deviceId } });

    return { message: 'Device supprime' };
  }

  async getDevices(userId: string) {
    return this.prisma.pushDevice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data: Record<string, string> = {},
  ) {
    const devices = await this.prisma.pushDevice.findMany({
      where: { userId },
    });

    if (devices.length === 0 || !this.messaging) {
      return { sent: 0 };
    }

    const tokens = devices.map((d) => d.token);
    const messages = tokens.map((token) => ({
      token,
      notification: { title, body },
      data,
      android: { priority: 'high' as const },
      apns: { payload: { aps: { contentAvailable: true } } },
      webpush: { headers: { Urgency: 'high' } },
    }));

    try {
      const response = await this.messaging!.sendEach(messages);

      // Handle failures - remove invalid tokens
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          this.logger.warn(`Push failed for token ${tokens[idx]}: ${resp.error}`);
          if (
            resp.error?.code === 'messaging/invalid-registration-token' ||
            resp.error?.code === 'messaging/registration-token-not-registered'
          ) {
            failedTokens.push(tokens[idx]);
          }
        }
      });

      if (failedTokens.length > 0) {
        await this.prisma.pushDevice.deleteMany({
          where: { token: { in: failedTokens } },
        });
      }

      this.logger.log(`Push sent: ${response.successCount}/${tokens.length} to user ${userId}`);
      return { sent: response.successCount, failed: response.failureCount };
    } catch (error) {
      this.logger.error('Push notification error', error);
      return { sent: 0, error: error.message };
    }
  }

  async sendIncomingCall(userId: string, callData: {
    callId: string;
    conversationId: string;
    initiatorId: string;
    type: 'audio' | 'video';
  }) {
    const initiator = await this.prisma.user.findUnique({
      where: { id: callData.initiatorId },
      select: { pseudo: true, avatarUrl: true },
    });

    return this.sendPushNotification(userId, 'Appel entrant', `${initiator?.pseudo || 'Quelqu\'un'} vous appelle`, {
      type: 'incoming_call',
      callId: callData.callId,
      conversationId: callData.conversationId,
      callType: callData.type,
    });
  }

  async sendNewMessage(userId: string, messageData: {
    conversationId: string;
    senderId: string;
    content: string;
    type: string;
  }) {
    const sender = await this.prisma.user.findUnique({
      where: { id: messageData.senderId },
      select: { pseudo: true },
    });

    return this.sendPushNotification(userId, `Message de ${sender?.pseudo || 'Quelqu\'un'}`, messageData.content, {
      type: 'new_message',
      conversationId: messageData.conversationId,
      messageType: messageData.type,
    });
  }

  async sendMeetingInvitation(userId: string, meetingData: {
    meetingId: number;
    organiserId: string;
    objet: string;
    startTime: Date;
  }) {
    const organiser = await this.prisma.user.findUnique({
      where: { id: meetingData.organiserId },
      select: { pseudo: true },
    });

    return this.sendPushNotification(userId, 'Nouvelle reunion', `${organiser?.pseudo || 'Quelqu\'un'} vous invite: ${meetingData.objet}`, {
      type: 'meeting_invitation',
      meetingId: meetingData.meetingId.toString(),
      startTime: meetingData.startTime.toISOString(),
    });
  }

  isEnabled(): boolean {
    return this.messaging !== null;
  }
}