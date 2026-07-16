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

import { MediaService } from '../services/media.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import {
  uploadMediaSchema,
  mediaParamsSchema,
  presignUploadSchema,
  UploadMediaDto,
  MediaParamsDto,
  PresignUploadDto,
} from '../dto/media.dto';

@ApiTags('Media')
@Controller('media')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Post('presign-upload')
  @ApiOperation({ summary: 'Obtenir une URL presignee pour upload' })
  @ApiResponse({ status: 200, description: 'URL de upload' })
  async presignUpload(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(presignUploadSchema)) dto: PresignUploadDto,
  ) {
    return this.mediaService.getPresignedUploadUrl(userId, dto);
  }

  @Post('confirm-upload')
  @ApiOperation({ summary: 'Confirmer l\'upload d\'un media' })
  @ApiResponse({ status: 201, description: 'Media enregistre' })
  async confirmUpload(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(uploadMediaSchema)) dto: UploadMediaDto,
  ) {
    return this.mediaService.confirmUpload(userId, dto);
  }

  @Get(':mediaId')
  @ApiOperation({ summary: 'Detail d\'un media' })
  @ApiResponse({ status: 200, description: 'Media trouve' })
  async getMedia(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(mediaParamsSchema)) params: MediaParamsDto,
  ) {
    return this.mediaService.getMedia(userId, params.mediaId);
  }

  @Get(':mediaId/download')
  @ApiOperation({ summary: 'Obtenir une URL de telechargement' })
  @ApiResponse({ status: 200, description: 'URL de telechargement' })
  async getDownloadUrl(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(mediaParamsSchema)) params: MediaParamsDto,
  ) {
    return this.mediaService.getPresignedDownloadUrl(userId, params.mediaId);
  }

  @Delete(':mediaId')
  @ApiOperation({ summary: 'Supprimer un media' })
  @ApiResponse({ status: 200, description: 'Media supprime' })
  async deleteMedia(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(mediaParamsSchema)) params: MediaParamsDto,
  ) {
    return this.mediaService.deleteMedia(userId, params.mediaId);
  }

  @Get('conversation/:conversationId')
  @ApiOperation({ summary: 'Medias d\'une conversation' })
  @ApiResponse({ status: 200, description: 'Liste des medias' })
  async getConversationMedia(
    @CurrentUser('sub') userId: string,
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: string,
  ) {
    return this.mediaService.getConversationMedia(
      userId,
      conversationId,
      limit ? parseInt(limit, 10) : 50,
    );
  }
}