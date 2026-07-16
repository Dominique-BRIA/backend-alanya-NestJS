import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';

import { BlockedController } from './controllers/blocked.controller';
import { BlockedService } from './services/blocked.service';

@Module({
  imports: [PrismaModule],
  controllers: [BlockedController],
  providers: [BlockedService],
  exports: [BlockedService],
})
export class BlockedModule {}