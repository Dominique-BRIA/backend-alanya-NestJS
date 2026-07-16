import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';

import { PushController } from './controllers/push.controller';
import { PushService } from './services/push.service';

@Module({
  imports: [PrismaModule],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}