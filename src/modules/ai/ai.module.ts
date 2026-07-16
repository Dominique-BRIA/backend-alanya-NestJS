import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';

import { AiController } from './controllers/ai.controller';
import { AiService } from './services/ai.service';

@Module({
  imports: [PrismaModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}