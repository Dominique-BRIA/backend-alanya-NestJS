import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenPayload } from '../../modules/auth/dto/token-payload.dto';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const token = client.handshake.auth?.token || client.handshake.query?.token;

    if (!token) {
      throw new UnauthorizedException('Token manquant');
    }

    try {
      const accessSecret = this.configService.get<string>('app.jwt.accessSecret');
      const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: accessSecret,
      });

      if (payload.scope !== 'access') {
        throw new UnauthorizedException('Scope de token invalide');
      }

      client.user = payload;
    } catch {
      throw new UnauthorizedException('Token invalide ou expire');
    }

    return true;
  }
}