import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import * as crypto from 'crypto';

export type OtpType = 'verification' | 'reset_password';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async createOtp(email: string, type: OtpType): Promise<string> {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = this.hashCode(code);

    const ttlMinutes = this.configService.get<number>('app.otp.ttlMinutes') ?? 10;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    // Delete any existing OTP for this email and type
    await this.prisma.emailVerification.deleteMany({
      where: { email, consumed: false },
    });

    // Create new OTP
    await this.prisma.emailVerification.create({
      data: {
        email,
        codeHash,
        expiresAt,
        type: type as any, // We'll need to add type to schema
      },
    });

    this.logger.debug(`OTP created for ${email} (${type})`);

    return code;
  }

  async verifyOtp(email: string, code: string, type: OtpType): Promise<boolean> {
    const codeHash = this.hashCode(code);

    const otp = await this.prisma.emailVerification.findFirst({
      where: {
        email,
        codeHash,
        consumed: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otp) {
      // Increment attempts for rate limiting
      await this.prisma.emailVerification.updateMany({
        where: { email, consumed: false },
        data: { attempts: { increment: 1 } },
      });
      return false;
    }

    // Check attempts (max 5)
    if (otp.attempts >= 5) {
      await this.prisma.emailVerification.update({
        where: { id: otp.id },
        data: { consumed: true },
      });
      return false;
    }

    // Mark as consumed
    await this.prisma.emailVerification.update({
      where: { id: otp.id },
      data: { consumed: true },
    });

    this.logger.debug(`OTP verified for ${email} (${type})`);
    return true;
  }

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }
}