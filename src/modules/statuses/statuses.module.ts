import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ContactsModule } from '../contacts/contacts.module';

import { StatusesController } from './controllers/statuses.controller';
import { StatusesService } from './services/statuses.service';

@Module({
  imports: [PrismaModule, ContactsModule],
  controllers: [StatusesController],
  providers: [StatusesService],
  exports: [StatusesService],
})
export class StatusesModule {}