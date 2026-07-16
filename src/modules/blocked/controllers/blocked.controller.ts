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

import { BlockedService } from '../services/blocked.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import {
  blockUserSchema,
  blockedParamsSchema,
  BlockUserDto,
  BlockedParamsDto,
} from '../dto/blocked.dto';

@ApiTags('Blocked')
@Controller('blocked')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class BlockedController {
  constructor(private blockedService: BlockedService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des utilisateurs bloques' })
  @ApiResponse({ status: 200, description: 'Liste des utilisateurs bloques' })
  async getBlockedUsers(@CurrentUser('sub') userId: string) {
    return this.blockedService.getBlockedUsers(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Bloquer un utilisateur' })
  @ApiResponse({ status: 201, description: 'Utilisateur bloque' })
  async blockUser(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(blockUserSchema)) dto: BlockUserDto,
  ) {
    return this.blockedService.blockUser(userId, dto);
  }

  @Delete(':blockedId')
  @ApiOperation({ summary: 'Debloquer un utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur debloque' })
  async unblockUser(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(blockedParamsSchema)) params: BlockedParamsDto,
  ) {
    return this.blockedService.unblockUser(userId, params.blockedId);
  }
}