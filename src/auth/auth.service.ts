import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { StringValue } from 'ms';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthStore } from './store/auth.store';
import { UserRole } from './enums/user-role.enum';

type TokenPair = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly authStore: AuthStore,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(
    dto: RegisterDto,
  ): Promise<{ user: AuthenticatedUser } & TokenPair> {
    const existing = this.authStore.findUserByEmail(dto.email);

    if (existing) {
      throw new ConflictException('Email ja cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const role =
      this.authStore.countUsers() === 0 ? UserRole.ADMIN : UserRole.USER;

    const created = this.authStore.createUser({
      name: dto.name,
      email: dto.email,
      role,
      passwordHash,
    });

    const user = this.toAuthenticatedUser(created);
    const tokens = await this.issueTokenPair(user);

    return {
      user,
      ...tokens,
    };
  }

  async login(dto: LoginDto): Promise<{ user: AuthenticatedUser } & TokenPair> {
    const user = this.authStore.findUserByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const matches = await bcrypt.compare(dto.password, user.passwordHash);

    if (!matches) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const safeUser = this.toAuthenticatedUser(user);
    const tokens = await this.issueTokenPair(safeUser);

    return {
      user: safeUser,
      ...tokens,
    };
  }

  async refresh(dto: RefreshTokenDto): Promise<TokenPair> {
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'git-rank-refresh-secret',
    );

    let payload: {
      sub: string;
      email: string;
      name: string;
      role: UserRole;
      type: 'refresh';
    };

    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalido ou expirado');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Token informado nao e refresh token');
    }

    const session = this.authStore.getSession(payload.sub);

    if (!session) {
      throw new UnauthorizedException(
        'Sessao nao encontrada para este usuario',
      );
    }

    const isTokenMatch = await bcrypt.compare(
      dto.refreshToken,
      session.refreshTokenHash,
    );

    if (!isTokenMatch) {
      throw new UnauthorizedException('Refresh token invalido');
    }

    if (new Date(session.refreshTokenExpiresAt).getTime() <= Date.now()) {
      this.authStore.clearSession(payload.sub);
      throw new UnauthorizedException('Refresh token expirado');
    }

    const user = this.authStore.findUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Usuario nao encontrado');
    }

    return this.issueTokenPair(this.toAuthenticatedUser(user));
  }

  getMe(userId: string): AuthenticatedUser {
    const user = this.authStore.findUserById(userId);

    if (!user) {
      throw new UnauthorizedException('Usuario nao encontrado');
    }

    return this.toAuthenticatedUser(user);
  }

  logout(userId: string): { message: string } {
    this.authStore.clearSession(userId);

    return {
      message: 'Logout realizado com sucesso',
    };
  }

  getUserForAuth(userId: string): AuthenticatedUser | null {
    const user = this.authStore.findUserById(userId);
    return user ? this.toAuthenticatedUser(user) : null;
  }

  private async issueTokenPair(user: AuthenticatedUser): Promise<TokenPair> {
    const accessTokenExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    ) as StringValue;
    const refreshTokenExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    ) as StringValue;

    const accessSecret = this.configService.get<string>(
      'JWT_ACCESS_SECRET',
      'git-rank-access-secret',
    );
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'git-rank-refresh-secret',
    );

    const accessTokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      type: 'access' as const,
    };

    const refreshTokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      type: 'refresh' as const,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessTokenPayload, {
        secret: accessSecret,
        expiresIn: accessTokenExpiresIn,
      }),
      this.jwtService.signAsync(refreshTokenPayload, {
        secret: refreshSecret,
        expiresIn: refreshTokenExpiresIn,
      }),
    ]);

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    this.authStore.saveSession(user.id, {
      refreshTokenHash,
      accessTokenExpiresAt: this.resolveExpiration(
        String(accessTokenExpiresIn),
      ),
      refreshTokenExpiresAt: this.resolveExpiration(
        String(refreshTokenExpiresIn),
      ),
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      accessTokenExpiresIn: String(accessTokenExpiresIn),
      refreshTokenExpiresIn: String(refreshTokenExpiresIn),
    };
  }

  private resolveExpiration(expiresIn: string): string {
    const match = expiresIn.match(/^(\d+)([smhd])$/);

    if (!match) {
      return new Date(Date.now() + 15 * 60 * 1000).toISOString();
    }

    const value = Number(match[1]);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + value * multipliers[unit]).toISOString();
  }

  private toAuthenticatedUser(user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  }): AuthenticatedUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
}
