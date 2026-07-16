import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

import { StatusesService } from '../services/statuses.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import {
  createStatusSchema,
  statusParamsSchema,
  getStatusesSchema,
  CreateStatusDto,
  StatusParamsDto,
  GetStatusesDto,
} from '../dto/statuses.dto';

@ApiTags('Statuses')
@Controller('statuses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class StatusesController {
  constructor(private statusesService: StatusesService) {}

  @Get()
  @ApiOperation({ summary: 'Fil d\'actualite des statuts (contacts + soi)' })
  @ApiResponse({ status: 200, description: 'Statuts pagines' })
  async getStatuses(
    @CurrentUser('sub') userId: string,
    @Query(new ZodValidationPipe(getStatusesSchema)) dto: GetStatusesDto,
  ) {
    return this.statusesService.getStatuses(userId, dto);
  }

  @Get('user/:targetUserId')
  @ApiOperation({ summary: 'Statuts d\'un utilisateur specifique' })
  @ApiResponse({ status: 200, description: 'Statuts de l\'utilisateur' })
  async getUserStatuses(
    @CurrentUser('sub') userId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.statusesService.getUserStatuses(userId, targetUserId);
  }

  @Post()
  @ApiOperation({ summary: 'Creer un statut (story)' })
  @ApiResponse({ status: 201, description: 'Statut cree' })
  async createStatus(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createStatusSchema)) dto: CreateStatusDto,
  ) {
    return this.statusesService.createStatus(userId, dto);
  }

  @Delete(':statusId')
  @ApiOperation({ summary: 'Supprimer son propre statut' })
  @ApiResponse({ status: 200, description: 'Statut supprime' })
  async deleteStatus(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(statusParamsSchema)) params: StatusParamsDto,
  ) {
    return this.statusesService.deleteStatus(userId, params.statusId);
  }

  @Post(':statusId/view')
  @ApiOperation({ summary: 'Marquer un statut comme vu' })
  @ApiResponse({ status: 200, description: 'Statut marque comme vu' })
  async viewStatus(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(statusParamsSchema)) params: StatusParamsDto,
  ) {
    return this.statusesService.viewStatus(userId, params.statusId);
  }

  @Get(':statusId/views')
  @ApiOperation({ summary: 'Voir qui a vu son statut' })
  @ApiResponse({ status: 200, description: 'Liste des vues' })
  async getStatusViews(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(statusParamsSchema)) params: StatusParamsDto,
  ) {
    return this.statusesService.getStatusViews(userId, params.statusId);
  }
}