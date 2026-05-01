import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';

type StoredApiKey = {
  id: string;
  userId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
};

@Injectable()
export class ApiKeyStore {
  private readonly apiKeysById = new Map<string, StoredApiKey>();
  private readonly apiKeyIdsByUserId = new Map<string, Set<string>>();
  private readonly apiKeyIdByHash = new Map<string, string>();

  createApiKey(input: {
    userId: string;
    name: string;
    rawKey: string;
    expiresAt: string;
  }): StoredApiKey {
    const id = randomUUID();
    const keyHash = this.hashApiKey(input.rawKey);
    const created: StoredApiKey = {
      id,
      userId: input.userId,
      name: input.name,
      keyHash,
      keyPrefix: input.rawKey.slice(0, 12),
      createdAt: new Date().toISOString(),
      expiresAt: input.expiresAt,
      revokedAt: null,
    };

    this.apiKeysById.set(id, created);
    this.apiKeyIdByHash.set(keyHash, id);

    const ids = this.apiKeyIdsByUserId.get(input.userId) ?? new Set<string>();
    ids.add(id);
    this.apiKeyIdsByUserId.set(input.userId, ids);

    return created;
  }

  findApiKeysByUserId(userId: string): StoredApiKey[] {
    const ids = this.apiKeyIdsByUserId.get(userId);

    if (!ids) {
      return [];
    }

    return Array.from(ids)
      .map((id) => this.apiKeysById.get(id))
      .filter((apiKey): apiKey is StoredApiKey => Boolean(apiKey));
  }

  revokeApiKey(userId: string, apiKeyId: string): boolean {
    const found = this.apiKeysById.get(apiKeyId);

    if (!found || found.userId !== userId || found.revokedAt) {
      return false;
    }

    this.apiKeysById.set(apiKeyId, {
      ...found,
      revokedAt: new Date().toISOString(),
    });

    return true;
  }

  findApiKeyByRawKey(rawKey: string): StoredApiKey | null {
    const keyHash = this.hashApiKey(rawKey);
    const id = this.apiKeyIdByHash.get(keyHash);

    if (!id) {
      return null;
    }

    return this.apiKeysById.get(id) ?? null;
  }

  private hashApiKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }
}
