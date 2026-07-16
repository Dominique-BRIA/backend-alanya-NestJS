import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PushModule } from '../push/push.module';

import { MeetingsController } from './controllers/meetings.controller';
import { MeetingsService } from './services/meetings.service';

@Module({
  imports: [PrismaModule, PushModule],
  controllers: [MeetingsController],
  providers: [MeetingsService],
  exports: [MeetingsService],
})
export class MeetingsModule {}