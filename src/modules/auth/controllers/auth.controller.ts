import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';

import { AuthService } from '../services/auth.service';
import { TokensService } from '../services/tokens.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import {
  registerSchema,
  loginSchema,
  verifySchema,
  setupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshSchema,
  RegisterDto,
  LoginDto,
  VerifyDto,
  SetupDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshDto,
} from '../dto/auth.dto';
import { TokenPayload } from '../dto/token-payload.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private tokensService: TokensService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Inscription utilisateur' })
  @ApiResponse({ status: 201, description: 'Inscription réussie, OTP envoyé' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  async register(@Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion utilisateur' })
  @ApiResponse({ status: 200, description: 'Connexion réussie, tokens retournés' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  async login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vérification email via OTP' })
  @ApiResponse({ status: 200, description: 'Email vérifié, setupToken retourné' })
  @ApiResponse({ status: 400, description: 'Code invalide ou expiré' })
  async verify(@Body(new ZodValidationPipe(verifySchema)) dto: VerifyDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Configuration du profil (pseudo + mot de passe)' })
  @ApiResponse({ status: 200, description: 'Profil configuré, tokens retournés' })
  @ApiResponse({ status: 400, description: 'Pseudo déjà pris ou profil déjà configuré' })
  @ApiBearerAuth('access-token')
  async setup(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(setupSchema)) dto: SetupDto,
  ) {
    return this.authService.setup(userId, dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Demande de réinitialisation mot de passe' })
  @ApiResponse({ status: 200, description: 'Si l\'email existe, OTP envoyé' })
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) dto: ForgotPasswordDto,
  ) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Réinitialisation mot de passe via OTP' })
  @ApiResponse({ status: 200, description: 'Mot de passe réinitialisé' })
  @ApiResponse({ status: 400, description: 'Code invalide ou expiré' })
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) dto: ResetPasswordDto,
  ) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rafraîchir les tokens d\'accès' })
  @ApiResponse({ status: 200, description: 'Nouveaux tokens générés' })
  @ApiResponse({ status: 401, description: 'Refresh token invalide ou expiré' })
  async refresh(@Body(new ZodValidationPipe(refreshSchema)) dto: RefreshDto) {
    return this.authService.refreshTokens(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Déconnexion' })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 200, description: 'Déconnexion réussie' })
  async logout(
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
    @Body() body: { refreshToken?: string },
  ) {
    return this.authService.logout(userId, body.refreshToken);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renvoyer le code de vérification email' })
  @ApiResponse({ status: 200, description: 'Code renvoyé si email non vérifié' })
  async resendVerification(@Body('email') email: string) {
    return this.authService.resendVerificationOtp(email);
  }

  @Get('me')
  @ApiOperation({ summary: 'Profil de l\'utilisateur connecté' })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 200, description: 'Profil utilisateur' })
  async me(@CurrentUser() user: TokenPayload) {
    return { user };
  }
}