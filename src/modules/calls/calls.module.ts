import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { PushModule } from '../push/push.module';

import { CallsController } from './controllers/calls.controller';
import { CallsService } from './services/calls.service';

@Module({
  imports: [PrismaModule, ConversationsModule, PushModule],
  controllers: [CallsController],
  providers: [CallsService],
  exports: [CallsService],
})
export class CallsModule {}