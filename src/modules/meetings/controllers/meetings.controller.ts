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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

import { MeetingsService } from '../services/meetings.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import {
  createMeetingSchema,
  updateMeetingSchema,
  meetingParamsSchema,
  participantActionSchema,
  CreateMeetingDto,
  UpdateMeetingDto,
  MeetingParamsDto,
  ParticipantActionDto,
} from '../dto/meetings.dto';

@ApiTags('Meetings')
@Controller('meetings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class MeetingsController {
  constructor(private meetingsService: MeetingsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des reunions de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Liste paginee des reunions' })
  async getMeetings(
    @CurrentUser('sub') userId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.meetingsService.getMeetings(
      userId,
      limit ? parseInt(limit, 10) : 20,
      cursor ? parseInt(cursor, 10) : undefined,
    );
  }

  @Get(':meetingId')
  @ApiOperation({ summary: 'Detail d\'une reunion' })
  @ApiResponse({ status: 200, description: 'Reunion trouvee' })
  async getMeeting(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(meetingParamsSchema)) params: MeetingParamsDto,
  ) {
    return this.meetingsService.getMeeting(userId, params.meetingId);
  }

  @Post()
  @ApiOperation({ summary: 'Creer une reunion planifiee' })
  @ApiResponse({ status: 201, description: 'Reunion creee' })
  async createMeeting(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createMeetingSchema)) dto: CreateMeetingDto,
  ) {
    return this.meetingsService.createMeeting(userId, dto);
  }

  @Put(':meetingId')
  @ApiOperation({ summary: 'Modifier une reunion (organisateur seulement)' })
  @ApiResponse({ status: 200, description: 'Reunion modifiee' })
  async updateMeeting(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(meetingParamsSchema)) params: MeetingParamsDto,
    @Body(new ZodValidationPipe(updateMeetingSchema)) dto: UpdateMeetingDto,
  ) {
    return this.meetingsService.updateMeeting(userId, params.meetingId, dto);
  }

  @Delete(':meetingId')
  @ApiOperation({ summary: 'Supprimer une reunion (organisateur seulement)' })
  @ApiResponse({ status: 200, description: 'Reunion supprimee' })
  async deleteMeeting(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(meetingParamsSchema)) params: MeetingParamsDto,
  ) {
    return this.meetingsService.deleteMeeting(userId, params.meetingId);
  }

  @Put(':meetingId/participants/:participantId')
  @ApiOperation({ summary: 'Repondre a une invitation (accepter/refuser)' })
  @ApiResponse({ status: 200, description: 'Statut mis a jour' })
  async updateParticipantStatus(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(meetingParamsSchema)) params: MeetingParamsDto,
    @Param('participantId') participantId: string,
    @Body(new ZodValidationPipe(participantActionSchema)) dto: ParticipantActionDto,
  ) {
    return this.meetingsService.updateParticipantStatus(userId, params.meetingId, {
      ...dto,
      participantId,
    });
  }

  @Put(':meetingId/connection')
  @ApiOperation({ summary: 'Mettre a jour le statut de connexion' })
  @ApiResponse({ status: 200, description: 'Statut de connexion mis a jour' })
  async updateConnectionStatus(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(meetingParamsSchema)) params: MeetingParamsDto,
    @Body('connected') connected: boolean,
  ) {
    return this.meetingsService.updateConnectionStatus(userId, params.meetingId, connected);
  }
}