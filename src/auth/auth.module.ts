import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ApiKeyService } from './api-key.service';
import { ApiKeyStore } from './store/api-key.store';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthStore } from './store/auth.store';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>(
          'JWT_ACCESS_SECRET',
          'git-rank-access-secret',
        ),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, ApiKeyService, AuthStore, ApiKeyStore, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
