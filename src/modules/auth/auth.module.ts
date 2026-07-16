import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { MailerService } from './services/mailer.service';
import { OtpService } from './services/otp.service';
import { TokensService } from './services/tokens.service';
import { PublicNumberService } from './services/public-number.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [
    PrismaModule,
    PushModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('app.jwt.accessSecret'),
        signOptions: {
          expiresIn: configService.get<string>('app.jwt.accessTtl'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    MailerService,
    OtpService,
    TokensService,
    PublicNumberService,
  ],
  exports: [
    AuthService,
    TokensService,
    OtpService,
    MailerService,
    PublicNumberService,
  ],
})
export class AuthModule {}