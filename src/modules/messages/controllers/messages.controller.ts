import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

import { MessagesService } from '../services/messages.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import {
  sendMessageSchema,
  messageParamsSchema,
  getMessagesSchema,
  SendMessageDto,
  MessageParamsDto,
  GetMessagesDto,
} from '../dto/messages.dto';

@ApiTags('Messages')
@Controller('conversations/:conversationId/messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des messages d\'une conversation' })
  @ApiResponse({ status: 200, description: 'Messages pagines' })
  async getMessages(
    @CurrentUser('sub') userId: string,
    @Param('conversationId') conversationId: string,
    @Query(new ZodValidationPipe(getMessagesSchema)) dto: GetMessagesDto,
  ) {
    return this.messagesService.getMessages(userId, conversationId, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Envoyer un message' })
  @ApiResponse({ status: 201, description: 'Message envoye' })
  async sendMessage(
    @CurrentUser('sub') userId: string,
    @Param('conversationId') conversationId: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) dto: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(userId, conversationId, dto);
  }

  @Delete(':messageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprimer un message (expediteur seulement)' })
  @ApiResponse({ status: 200, description: 'Message supprime' })
  async deleteMessage(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(messageParamsSchema)) params: MessageParamsDto,
  ) {
    return this.messagesService.deleteMessage(userId, params.messageId);
  }

  @Post(':messageId/hide')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Masquer un message pour soi-meme' })
  @ApiResponse({ status: 200, description: 'Message masque' })
  async hideMessage(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(messageParamsSchema)) params: MessageParamsDto,
  ) {
    return this.messagesService.hideMessage(userId, params.messageId);
  }

  @Put(':messageId/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marquer un message comme lu' })
  @ApiResponse({ status: 200, description: 'Message marque comme lu' })
  async markAsRead(
    @CurrentUser('sub') userId: string,
    @Param('conversationId') conversationId: string,
    @Param(new ZodValidationPipe(messageParamsSchema)) params: MessageParamsDto,
  ) {
    return this.messagesService.markAsRead(userId, conversationId, params.messageId);
  }

  @Get('unread/count')
  @ApiOperation({ summary: 'Nombre de messages non lus' })
  @ApiResponse({ status: 200, description: 'Compteur non lus' })
  async getUnreadCount(
    @CurrentUser('sub') userId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.messagesService.getUnreadCount(userId, conversationId);
  }
}