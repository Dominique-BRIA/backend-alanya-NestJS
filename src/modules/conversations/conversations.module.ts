import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';

import { ConversationsController } from './controllers/conversations.controller';
import { ConversationsService } from './services/conversations.service';

@Module({
  imports: [PrismaModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}