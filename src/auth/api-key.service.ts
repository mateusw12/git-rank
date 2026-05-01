import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { ApiKeyStore } from './store/api-key.store';
import { AuthStore } from './store/auth.store';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

type ApiKeyResponse = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
};

@Injectable()
export class ApiKeyService {
  constructor(
    private readonly authStore: AuthStore,
    private readonly apiKeyStore: ApiKeyStore,
    private readonly configService: ConfigService,
  ) {}

  createApiKey(userId: string, dto: CreateApiKeyDto): ApiKeyResponse & { apiKey: string } {
    const user = this.authStore.findUserById(userId);

    if (!user) {
      throw new UnauthorizedException('Usuario nao encontrado');
    }

    const apiKey = `gitrk_${randomBytes(32).toString('hex')}`;
    const expiresInDays = dto.expiresInDays ?? this.getDefaultApiKeyExpirationDays();
    const expiresAt = new Date(
      Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
    ).toISOString();

    const created = this.apiKeyStore.createApiKey({
      userId,
      name: dto.name,
      rawKey: apiKey,
      expiresAt,
    });

    return {
      id: created.id,
      name: created.name,
      keyPrefix: created.keyPrefix,
      createdAt: created.createdAt,
      expiresAt: created.expiresAt,
      revokedAt: created.revokedAt,
      apiKey,
    };
  }

  listApiKeys(userId: string): ApiKeyResponse[] {
    const user = this.authStore.findUserById(userId);

    if (!user) {
      throw new UnauthorizedException('Usuario nao encontrado');
    }

    return this.apiKeyStore.findApiKeysByUserId(userId).map((item) => ({
      id: item.id,
      name: item.name,
      keyPrefix: item.keyPrefix,
      createdAt: item.createdAt,
      expiresAt: item.expiresAt,
      revokedAt: item.revokedAt,
    }));
  }

  revokeApiKey(userId: string, apiKeyId: string): { message: string } {
    const revoked = this.apiKeyStore.revokeApiKey(userId, apiKeyId);

    if (!revoked) {
      throw new NotFoundException('API key nao encontrada para este usuario');
    }

    return {
      message: 'API key revogada com sucesso',
    };
  }

  private getDefaultApiKeyExpirationDays(): number {
    return this.configService.get<number>('API_KEY_EXPIRES_IN_DAYS', 90);
  }
}
