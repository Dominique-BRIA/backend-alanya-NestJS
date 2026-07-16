import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

import { ConversationsService } from '../services/conversations.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import {
  createConversationSchema,
  updateConversationSchema,
  conversationParamsSchema,
  addParticipantsSchema,
  CreateConversationDto,
  UpdateConversationDto,
  ConversationParamsDto,
  AddParticipantsDto,
} from '../dto/conversations.dto';

@ApiTags('Conversations')
@Controller('conversations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des conversations' })
  @ApiResponse({ status: 200, description: 'Liste paginee des conversations' })
  async getConversations(
    @CurrentUser('sub') userId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.conversationsService.getConversations(
      userId,
      limit ? parseInt(limit, 10) : 50,
      cursor,
    );
  }

  @Get(':conversationId')
  @ApiOperation({ summary: 'Detail d\'une conversation' })
  @ApiResponse({ status: 200, description: 'Conversation trouvee' })
  @ApiResponse({ status: 404, description: 'Conversation non trouvee' })
  async getConversation(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(conversationParamsSchema)) params: ConversationParamsDto,
  ) {
    return this.conversationsService.getConversation(userId, params.conversationId);
  }

  @Post()
  @ApiOperation({ summary: 'Creer une conversation (directe ou groupe)' })
  @ApiResponse({ status: 201, description: 'Conversation creee' })
  async createConversation(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createConversationSchema)) dto: CreateConversationDto,
  ) {
    return this.conversationsService.createConversation(userId, dto);
  }

  @Put(':conversationId')
  @ApiOperation({ summary: 'Modifier une conversation (admin seulement)' })
  @ApiResponse({ status: 200, description: 'Conversation modifiee' })
  async updateConversation(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(conversationParamsSchema)) params: ConversationParamsDto,
    @Body(new ZodValidationPipe(updateConversationSchema)) dto: UpdateConversationDto,
  ) {
    return this.conversationsService.updateConversation(userId, params.conversationId, dto);
  }

  @Post(':conversationId/participants')
  @ApiOperation({ summary: 'Ajouter des participants (groupe, admin seulement)' })
  @ApiResponse({ status: 201, description: 'Participants ajoutes' })
  async addParticipants(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(conversationParamsSchema)) params: ConversationParamsDto,
    @Body(new ZodValidationPipe(addParticipantsSchema)) dto: AddParticipantsDto,
  ) {
    return this.conversationsService.addParticipants(userId, params.conversationId, dto);
  }

  @Delete(':conversationId/participants/:targetUserId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retirer un participant (ou quitter soi-meme)' })
  @ApiResponse({ status: 200, description: 'Participant retire' })
  async removeParticipant(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(conversationParamsSchema)) params: ConversationParamsDto,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.conversationsService.removeParticipant(userId, params.conversationId, targetUserId);
  }

  @Post(':conversationId/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quitter la conversation' })
  @ApiResponse({ status: 200, description: 'Conversation quittee' })
  async leaveConversation(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(conversationParamsSchema)) params: ConversationParamsDto,
  ) {
    return this.conversationsService.leaveConversation(userId, params.conversationId);
  }
}
