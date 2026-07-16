import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

import { CountriesService } from '../services/countries.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Public } from '../../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import {
  createCountrySchema,
  updateCountrySchema,
  CreateCountryDto,
  UpdateCountryDto,
} from '../dto/countries.dto';

@ApiTags('Countries')
@Controller('pays')
export class CountriesController {
  constructor(private countriesService: CountriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liste de tous les pays' })
  @ApiResponse({ status: 200, description: 'Liste des pays' })
  async findAll() {
    return this.countriesService.findAll();
  }

  @Public()
  @Get(':idPays')
  @ApiOperation({ summary: 'Detail d\'un pays' })
  @ApiResponse({ status: 200, description: 'Pays trouve' })
  @ApiResponse({ status: 404, description: 'Pays non trouve' })
  async findOne(@Param('idPays') idPays: string) {
    return this.countriesService.findOne(parseInt(idPays, 10));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Creer un pays (admin)' })
  @ApiResponse({ status: 201, description: 'Pays cree' })
  async create(
    @Body(new ZodValidationPipe(createCountrySchema)) dto: CreateCountryDto,
  ) {
    return this.countriesService.create(dto);
  }

  @Put(':idPays')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Mettre a jour un pays (admin)' })
  @ApiResponse({ status: 200, description: 'Pays mis a jour' })
  async update(
    @Param('idPays') idPays: string,
    @Body(new ZodValidationPipe(updateCountrySchema)) dto: UpdateCountryDto,
  ) {
    return this.countriesService.update(parseInt(idPays, 10), dto);
  }

  @Delete(':idPays')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprimer un pays (admin)' })
  @ApiResponse({ status: 200, description: 'Pays supprime' })
  async delete(@Param('idPays') idPays: string) {
    return this.countriesService.delete(parseInt(idPays, 10));
  }
}