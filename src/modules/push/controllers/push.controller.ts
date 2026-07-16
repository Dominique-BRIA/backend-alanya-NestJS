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

import { PushService } from '../services/push.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import {
  registerDeviceSchema,
  deviceParamsSchema,
  RegisterDeviceDto,
  DeviceParamsDto,
} from '../dto/push.dto';

@ApiTags('Push')
@Controller('push')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class PushController {
  constructor(private pushService: PushService) {}

  @Post('register')
  @ApiOperation({ summary: 'Enregistrer un device pour les notifications push' })
  @ApiResponse({ status: 201, description: 'Device enregistre' })
  async registerDevice(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(registerDeviceSchema)) dto: RegisterDeviceDto,
  ) {
    return this.pushService.registerDevice(userId, dto);
  }

  @Get('devices')
  @ApiOperation({ summary: 'Lister les devices enregistres' })
  @ApiResponse({ status: 200, description: 'Liste des devices' })
  async getDevices(@CurrentUser('sub') userId: string) {
    return this.pushService.getDevices(userId);
  }

  @Delete('devices/:deviceId')
  @ApiOperation({ summary: 'Supprimer un device' })
  @ApiResponse({ status: 200, description: 'Device supprime' })
  async unregisterDevice(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(deviceParamsSchema)) params: DeviceParamsDto,
  ) {
    return this.pushService.unregisterDevice(userId, params.deviceId);
  }
}