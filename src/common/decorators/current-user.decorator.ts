import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TokenPayload } from '../../modules/auth/dto/token-payload.dto';

export const CurrentUser = createParamDecorator(
  (data: keyof TokenPayload | undefined, ctx: ExecutionContext): TokenPayload | string | null => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as TokenPayload;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);