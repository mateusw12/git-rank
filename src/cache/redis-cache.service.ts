import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisMemoryService } from '../queue/redis-memory.service';

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private client: Redis | null = null;

  constructor(
    private readonly redisMemoryService: RedisMemoryService,
    private readonly configService: ConfigService,
  ) {}

  async getJson<T>(key: string): Promise<T | null> {
    const client = await this.getClient();
    const namespacedKey = this.resolveKey(key);
    const value = await client.get(namespacedKey);

    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  }

  async setJson(
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    const client = await this.getClient();
    const namespacedKey = this.resolveKey(key);
    const payload = JSON.stringify(value);

    await client.set(namespacedKey, payload, 'EX', ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    const client = await this.getClient();
    await client.del(this.resolveKey(key));
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) {
      return;
    }

    await this.client.quit();
    this.client = null;
  }

  private async getClient(): Promise<Redis> {
    if (this.client) {
      return this.client;
    }

    const connection = await this.redisMemoryService.getConnection();

    this.client = new Redis({
      host: connection.host,
      port: connection.port,
      maxRetriesPerRequest: 1,
    });

    return this.client;
  }

  private resolveKey(key: string): string {
    const prefix = this.configService.get<string>('CACHE_PREFIX', 'git-rank');
    return `${prefix}:${key}`;
  }
}
