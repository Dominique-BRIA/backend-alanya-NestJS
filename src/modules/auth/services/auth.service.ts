import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../prisma/prisma.service';
import { MailerService } from './mailer.service';
import { OtpService } from './otp.service';
import { TokensService } from './tokens.service';
import { PushService } from '../../push/services/push.service';
import { PublicNumberService } from './public-number.service';
import {
  RegisterDto,
  LoginDto,
  VerifyDto,
  SetupDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshDto,
} from '../dto/auth.dto';
import { TokenPayload, TokenScope } from '../dto/token-payload.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailerService: MailerService,
    private otpService: OtpService,
    private tokensService: TokensService,
    private pushService: PushService,
    private publicNumberService: PublicNumberService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      if (existingUser.emailVerified) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
      // Email not verified, we can resend OTP
      await this.sendVerificationOtp(dto.email);
      return { message: 'Un code de vérification a été renvoyé à votre email' };
    }

    // Generate public number
    const publicNumber = await this.publicNumberService.generate();

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user (unverified)
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        publicNumber,
        idPays: dto.idPays,
        nom: dto.nom,
        emailVerified: false,
      },
    });

    // Send verification OTP
    await this.sendVerificationOtp(dto.email);

    this.logger.log(`New user registered: ${user.id} (${user.email})`);

    return {
      message: 'Inscription réussie. Un code de vérification a été envoyé à votre email.',
      userId: user.id,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    if (!user.emailVerified) {
      // Resend OTP
      await this.sendVerificationOtp(dto.email);
      throw new UnauthorizedException(
        'Email non vérifié. Un nouveau code a été envoyé.',
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user.id);

    // Store refresh token
    await this.tokensService.storeRefreshToken(user.id, refreshToken);

    this.logger.log(`User logged in: ${user.id}`);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async verifyEmail(dto: VerifyDto) {
    const isValid = await this.otpService.verifyOtp(dto.email, dto.code, 'verification');

    if (!isValid) {
      throw new BadRequestException('Code invalide ou expiré');
    }

    const user = await this.prisma.user.update({
      where: { email: dto.email },
      data: { emailVerified: true },
    });

    this.logger.log(`Email verified: ${user.id}`);

    // Generate setup token (15 min) for pseudo/password setup
    const setupToken = await this.generateSetupToken(user.id);

    return {
      message: 'Email vérifié avec succès',
      setupToken,
      userId: user.id,
    };
  }

  async setup(userId: string, dto: SetupDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    if (user.emailVerified && user.pseudo) {
      throw new BadRequestException('Profil déjà configuré');
    }

    // Check pseudo uniqueness
    const existingPseudo = await this.prisma.user.findFirst({
      where: { pseudo: dto.pseudo },
    });

    if (existingPseudo) {
      throw new ConflictException('Ce pseudo est déjà pris');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        pseudo: dto.pseudo,
        passwordHash, // Update password if provided during setup
      },
    });

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(userId);
    await this.tokensService.storeRefreshToken(userId, refreshToken);

    this.logger.log(`User setup completed: ${userId}`);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(updatedUser),
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Always return success to prevent email enumeration
    if (!user || !user.emailVerified) {
      return { message: 'Si cet email existe, un code de réinitialisation a été envoyé' };
    }

    await this.sendResetPasswordOtp(dto.email);

    return { message: 'Si cet email existe, un code de réinitialisation a été envoyé' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const isValid = await this.otpService.verifyOtp(dto.email, dto.code, 'reset_password');

    if (!isValid) {
      throw new BadRequestException('Code invalide ou expiré');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Revoke all refresh tokens
    await this.tokensService.revokeAllUserTokens(user.id);

    this.logger.log(`Password reset for user: ${user.id}`);

    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  async refreshTokens(dto: RefreshDto) {
    const { refreshToken } = dto;

    // Verify refresh token
    let payload: TokenPayload;
    try {
      const refreshSecret = this.configService.get<string>('app.jwt.refreshSecret');
      payload = await this.jwtService.verifyAsync<TokenPayload>(refreshToken, {
        secret: refreshSecret,
      });

      if (payload.scope !== 'refresh') {
        throw new UnauthorizedException('Token invalide');
      }
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    // Check if token exists in DB and not revoked
    const tokenHash = await this.tokensService.hashToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token révoqué ou expiré');
    }

    // Revoke old token and create new ones
    await this.tokensService.revokeToken(storedToken.id);

    const { accessToken, refreshToken: newRefreshToken } = await this.generateTokens(
      payload.sub,
    );
    await this.tokensService.storeRefreshToken(payload.sub, newRefreshToken);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = await this.tokensService.hashToken(refreshToken);
      await this.tokensService.revokeTokenByHash(tokenHash);
    } else {
      // Revoke all tokens if no specific token provided
      await this.tokensService.revokeAllUserTokens(userId);
    }

    return { message: 'Déconnexion réussie' };
  }

  async resendVerificationOtp(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Don't reveal if email exists
      return { message: 'Si cet email existe, un code a été envoyé' };
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email déjà vérifié');
    }

    await this.sendVerificationOtp(email);
    return { message: 'Code de vérification renvoyé' };
  }

  private async sendVerificationOtp(email: string) {
    await this.otpService.createOtp(email, 'verification');
    await this.mailerService.sendOtpEmail(email, 'verification');
  }

  private async sendResetPasswordOtp(email: string) {
    await this.otpService.createOtp(email, 'reset_password');
    await this.mailerService.sendOtpEmail(email, 'reset_password');
  }

  private async generateTokens(userId: string) {
    const accessSecret = this.configService.get<string>('app.jwt.accessSecret');
    const refreshSecret = this.configService.get<string>('app.jwt.refreshSecret');
    const accessTtl = this.configService.get<string>('app.jwt.accessTtl');
    const refreshTtl = this.configService.get<string>('app.jwt.refreshTtl');

    const accessToken = await this.jwtService.signAsync(
      { sub: userId, scope: 'access' as TokenScope },
      { secret: accessSecret, expiresIn: accessTtl },
    );

    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, scope: 'refresh' as TokenScope },
      { secret: refreshSecret, expiresIn: refreshTtl },
    );

    return { accessToken, refreshToken };
  }

  private async generateSetupToken(userId: string) {
    const accessSecret = this.configService.get<string>('app.jwt.accessSecret');
    return this.jwtService.signAsync(
      { sub: userId, scope: 'setup' as TokenScope },
      { secret: accessSecret, expiresIn: '15m' },
    );
  }

  private sanitizeUser(user: any) {
    const { passwordHash, refreshTokens, ...sanitized } = user;
    return sanitized;
  }
}