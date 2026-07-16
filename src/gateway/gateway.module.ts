import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../modules/auth/auth.module';

import { EventsGateway } from './events.gateway';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('app.jwt.accessSecret'),
        signOptions: { expiresIn: configService.get<string>('app.jwt.accessTtl') },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class GatewayModule {}
