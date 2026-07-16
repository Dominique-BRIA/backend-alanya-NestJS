import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';

import { CountriesController } from './controllers/countries.controller';
import { CountriesService } from './services/countries.service';

@Module({
  imports: [PrismaModule],
  controllers: [CountriesController],
  providers: [CountriesService],
  exports: [CountriesService],
})
export class CountriesModule {}