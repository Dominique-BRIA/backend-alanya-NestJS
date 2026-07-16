import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

import { CallsService } from '../services/calls.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import {
  initiateCallSchema,
  callActionSchema,
  callParamsSchema,
  InitiateCallDto,
  CallActionDto,
  CallParamsDto,
} from '../dto/calls.dto';

@ApiTags('Calls')
@Controller('calls')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class CallsController {
  constructor(private callsService: CallsService) {}

  @Post('initiate')
  @ApiOperation({ summary: 'Initier un appel audio/video' })
  @ApiResponse({ status: 201, description: 'Appel initie' })
  async initiateCall(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(initiateCallSchema)) dto: InitiateCallDto,
  ) {
    return this.callsService.initiateCall(userId, dto);
  }

  @Put('action')
  @ApiOperation({ summary: 'Accepter, refuser ou terminer un appel' })
  @ApiResponse({ status: 200, description: 'Action effectuee' })
  async handleCallAction(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(callActionSchema)) dto: CallActionDto,
  ) {
    return this.callsService.handleCallAction(userId, dto);
  }

  @Get(':callId')
  @ApiOperation({ summary: 'Detail d\'un appel' })
  @ApiResponse({ status: 200, description: 'Appel trouve' })
  async getCall(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(callParamsSchema)) params: CallParamsDto,
  ) {
    return this.callsService.getCall(userId, params.callId);
  }

  @Get()
  @ApiOperation({ summary: 'Historique des appels' })
  @ApiResponse({ status: 200, description: 'Liste paginee des appels' })
  async getCallHistory(
    @CurrentUser('sub') userId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.callsService.getCallHistory(
      userId,
      limit ? parseInt(limit, 10) : 20,
      cursor,
    );
  }
}