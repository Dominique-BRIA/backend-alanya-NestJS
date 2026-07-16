import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../modules/auth/auth.module';

import { EventsGateway } from './events.gateway';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class GatewayModule {}