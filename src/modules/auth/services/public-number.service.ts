import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PublicNumberService {
  private readonly logger = new Logger(PublicNumberService.name);

  constructor(private prisma: PrismaService) {}

  async generate(): Promise<string> {
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Generate 6-digit number (100000-999999)
      const number = Math.floor(100000 + Math.random() * 900000).toString();

      // Check if already exists
      const existing = await this.prisma.user.findUnique({
        where: { publicNumber: number },
      });

      if (!existing) {
        return number;
      }
    }

    // Fallback: use timestamp-based approach
    const timestamp = Date.now().toString().slice(-6);
    const padded = timestamp.padStart(6, '0');

    // Ensure uniqueness even with fallback
    let finalNumber = padded;
    let counter = 0;
    while (counter < 100) {
      const existing = await this.prisma.user.findUnique({
        where: { publicNumber: finalNumber },
      });
      if (!existing) {
        return finalNumber;
      }
      counter++;
      const num = (parseInt(finalNumber, 10) + 1) % 1000000;
      finalNumber = num.toString().padStart(6, '0');
    }

    throw new Error('Impossible de générer un numéro public unique');
  }
}