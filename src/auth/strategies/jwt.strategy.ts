import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { AuthService } from '../auth.service';
import { UserRole } from '../enums/user-role.enum';

type AccessTokenPayload = {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  type: 'access' | 'refresh';
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_ACCESS_SECRET',
        'git-rank-access-secret',
      ),
    });
  }

  validate(payload: AccessTokenPayload): AuthenticatedUser {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Token invalido para acesso');
    }

    const user = this.authService.getUserForAuth(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Usuario nao autorizado');
    }

    return user;
  }
}
