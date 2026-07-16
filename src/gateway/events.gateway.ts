import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { TokenPayload } from '../modules/auth/dto/token-payload.dto';

interface AuthenticatedSocket extends Socket {
  user?: TokenPayload;
}

@WebSocketGateway({
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://alanya.app', 'https://www.alanya.app']
      : '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private userSockets = new Map<string, Set<AuthenticatedSocket>>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;

      if (!token) {
        this.logger.warn(`Connection rejected: no token from ${client.id}`);
        client.disconnect();
        return;
      }

      const accessSecret = this.configService.get<string>('app.jwt.accessSecret');
      const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: accessSecret,
      });

      if (payload.scope !== 'access') {
        this.logger.warn(`Connection rejected: invalid scope from ${client.id}`);
        client.disconnect();
        return;
      }

      client.user = payload;
      this.addClient(payload.sub, client);

      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);

      // Update user online status
      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { isOnline: 1 },
      });

      // Notify contacts
      this.broadcastUserStatus(payload.sub, true);
    } catch (error) {
      this.logger.warn(`Connection rejected: ${error.message} from ${client.id}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      this.removeClient(client.user.sub, client);

      // Check if user has other connections
      if (!this.isUserOnline(client.user.sub)) {
        await this.prisma.user.update({
          where: { id: client.user.sub },
          data: { isOnline: 0, lastSeen: new Date() },
        });

        this.broadcastUserStatus(client.user.sub, false);
      }

      this.logger.log(`Client disconnected: ${client.id} (user: ${client.user.sub})`);
    }
  }

  private addClient(userId: string, client: AuthenticatedSocket) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client);
  }

  private removeClient(userId: string, client: AuthenticatedSocket) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  private isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return false;
    for (const socket of sockets) {
      if (socket.connected) return true;
    }
    return false;
  }

  private broadcastUserStatus(userId: string, isOnline: boolean) {
    this.server.emit('user:status', { userId, isOnline });
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; content: string; type?: string; mediaId?: string },
  ) {
    if (!client.user) throw new WsException('Non authentifie');

    // This would typically call the MessagesService
    // For now, emit to conversation participants
    this.server.to(`conversation:${data.conversationId}`).emit('message:new', {
      conversationId: data.conversationId,
      senderId: client.user.sub,
      content: data.content,
      type: data.type || 'text',
      mediaId: data.mediaId,
      createdAt: new Date().toISOString(),
    });

    return { success: true };
  }

  @SubscribeMessage('message:read')
  async handleReadMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; messageId: string },
  ) {
    if (!client.user) throw new WsException('Non authentifie');

    this.server.to(`conversation:${data.conversationId}`).emit('message:read', {
      messageId: data.messageId,
      readBy: client.user.sub,
      readAt: new Date().toISOString(),
    });

    return { success: true };
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.user) throw new WsException('Non authentifie');

    client.to(`conversation:${data.conversationId}`).emit('typing:start', {
      conversationId: data.conversationId,
      userId: client.user.sub,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.user) throw new WsException('Non authentifie');

    client.to(`conversation:${data.conversationId}`).emit('typing:stop', {
      conversationId: data.conversationId,
      userId: client.user.sub,
    });
  }

  @SubscribeMessage('call:signal')
  handleCallSignal(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string; targetUserId: string; signal: any },
  ) {
    if (!client.user) throw new WsException('Non authentifie');

    // Forward signaling to target user
    this.sendToUser(data.targetUserId, 'call:signal', {
      callId: data.callId,
      fromUserId: client.user.sub,
      signal: data.signal,
    });

    return { success: true };
  }

  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.user) throw new WsException('Non authentifie');

    // Verify user is participant
    const participation = await this.prisma.participant.findUnique({
      where: { userId_conversationId: { userId: client.user.sub, conversationId: data.conversationId } },
    });

    if (!participation) {
      throw new WsException('Non autorise');
    }

    client.join(`conversation:${data.conversationId}`);
    return { success: true };
  }

  @SubscribeMessage('conversation:leave')
  handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.user) throw new WsException('Non authentifie');

    client.leave(`conversation:${data.conversationId}`);
    return { success: true };
  }

  // Helper to send to specific user
  sendToUser(userId: string, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      for (const socket of sockets) {
        if (socket.connected) {
          socket.emit(event, data);
        }
      }
    }
  }

  // Public methods for other services to emit events
  emitNewMessage(conversationId: string, message: any) {
    this.server.to(`conversation:${conversationId}`).emit('message:new', message);
  }

  emitMessageRead(conversationId: string, messageId: string, userId: string) {
    this.server.to(`conversation:${conversationId}`).emit('message:read', { messageId, readBy: userId });
  }

  emitIncomingCall(userId: string, callData: any) {
    this.sendToUser(userId, 'call:incoming', callData);
  }

  emitCallUpdate(callId: string, update: any) {
    this.server.emit(`call:${callId}:update`, update);
  }

  emitNewStatus(userId: string, status: any) {
    // Send to user's contacts
    this.sendToUser(userId, 'status:new', status);
  }

  emitStatusViewed(statusId: string, viewerId: string) {
    this.server.emit(`status:${statusId}:viewed`, { statusId, viewerId });
  }
}