import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check basique' })
  @ApiResponse({ status: 200, description: 'Service operationnel' })
  async health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: this.configService.get<string>('app.nodeEnv'),
    };
  }

  @Public()
  @Get('db')
  @ApiOperation({ summary: 'Health check base de donnees' })
  @ApiResponse({ status: 200, description: 'Base de donnees accessible' })
  @ApiResponse({ status: 503, description: 'Base de donnees inaccessible' })
  async healthDb() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        database: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness check (pour Kubernetes)' })
  @ApiResponse({ status: 200, description: 'Pret a recevoir du trafic' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready' };
    } catch {
      return { status: 'not ready' };
    }
  }

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'Liveness check (pour Kubernetes)' })
  @ApiResponse({ status: 200, description: 'Application vivante' })
  async live() {
    return { status: 'alive' };
  }
}