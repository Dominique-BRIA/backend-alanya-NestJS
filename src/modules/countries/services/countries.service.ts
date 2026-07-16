import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCountryDto, UpdateCountryDto } from '../dto/countries.dto';

@Injectable()
export class CountriesService {
  private readonly logger = new Logger(CountriesService.name);

  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.pays.findMany({
      orderBy: { libelle: 'asc' },
    });
  }

  async findOne(idPays: number) {
    const country = await this.prisma.pays.findUnique({
      where: { idPays },
    });

    if (!country) {
      throw new NotFoundException('Pays non trouvé');
    }

    return country;
  }

  async create(dto: CreateCountryDto) {
    const country = await this.prisma.pays.create({
      data: dto,
    });

    this.logger.log(`Country created: ${country.idPays} - ${country.libelle}`);
    return country;
  }

  async update(idPays: number, dto: UpdateCountryDto) {
    await this.findOne(idPays);

    const country = await this.prisma.pays.update({
      where: { idPays },
      data: dto,
    });

    this.logger.log(`Country updated: ${idPays}`);
    return country;
  }

  async delete(idPays: number) {
    await this.findOne(idPays);

    await this.prisma.pays.delete({
      where: { idPays },
    });

    this.logger.log(`Country deleted: ${idPays}`);
    return { message: 'Pays supprimé' };
  }
}