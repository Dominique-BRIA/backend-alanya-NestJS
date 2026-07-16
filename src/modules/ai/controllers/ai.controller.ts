import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

import { AiService } from '../services/ai.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import {
  chatSchema,
  threadParamsSchema,
  createThreadSchema,
  ChatDto,
  ThreadParamsDto,
  CreateThreadDto,
} from '../dto/ai.dto';

@ApiTags('AI')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class AiController {
  constructor(private aiService: AiService) {}

  @Get('threads')
  @ApiOperation({ summary: 'Liste des threads de conversation IA' })
  @ApiResponse({ status: 200, description: 'Liste des threads' })
  async getThreads(@CurrentUser('sub') userId: string) {
    return this.aiService.getThreads(userId);
  }

  @Get('threads/:threadId')
  @ApiOperation({ summary: 'Detail d\'un thread avec messages' })
  @ApiResponse({ status: 200, description: 'Thread trouve' })
  async getThread(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(threadParamsSchema)) params: ThreadParamsDto,
  ) {
    return this.aiService.getThread(userId, params.threadId);
  }

  @Post('threads')
  @ApiOperation({ summary: 'Creer un nouveau thread' })
  @ApiResponse({ status: 201, description: 'Thread cree' })
  async createThread(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createThreadSchema)) dto: CreateThreadDto,
  ) {
    return this.aiService.createThread(userId, dto);
  }

  @Delete('threads/:threadId')
  @ApiOperation({ summary: 'Supprimer un thread' })
  @ApiResponse({ status: 200, description: 'Thread supprime' })
  async deleteThread(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(threadParamsSchema)) params: ThreadParamsDto,
  ) {
    return this.aiService.deleteThread(userId, params.threadId);
  }

  @Post('chat')
  @ApiOperation({ summary: 'Envoyer un message a l\'IA' })
  @ApiResponse({ status: 200, description: 'Reponse de l\'IA' })
  async chat(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(chatSchema)) dto: ChatDto,
  ) {
    return this.aiService.chat(userId, dto);
  }
}