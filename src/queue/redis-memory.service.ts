import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { RedisMemoryServer } from 'redis-memory-server';

type RedisConnection = {
  host: string;
  port: number;
};

@Injectable()
export class RedisMemoryService implements OnModuleDestroy {
  private readonly redisServer = new RedisMemoryServer();

  async getConnection(): Promise<RedisConnection> {
    const host = await this.redisServer.getHost();
    const port = await this.redisServer.getPort();

    return { host, port };
  }

  async onModuleDestroy(): Promise<void> {
    await this.redisServer.stop();
  }
}
