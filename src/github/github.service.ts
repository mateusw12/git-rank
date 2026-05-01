import { Injectable, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { RedisCacheService } from '../cache/redis-cache.service';
import { GithubRepository } from './types/github-repository.type';

@Injectable()
export class GithubService {
  private readonly cacheTtlSeconds: number;

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
    private readonly redisCacheService: RedisCacheService,
  ) {
    this.cacheTtlSeconds = this.configService.get<number>(
      'GITHUB_REPOS_CACHE_TTL_SECONDS',
      300,
    );
  }

  async getUserRepository(username: string): Promise<GithubRepository[]> {
    const normalizedUsername = username.toLowerCase();
    const cacheKey = `github:repos:${normalizedUsername}`;

    try {
      const cached = await this.redisCacheService.getJson<GithubRepository[]>(
        cacheKey,
      );

      if (cached) {
        return cached;
      }
    } catch {
      // Nao bloqueia a rota quando ocorrer falha temporaria de cache.
    }

    try {
      const response = await firstValueFrom(
        this.http.get<GithubRepository[]>(`/users/${normalizedUsername}/repos`)
      );

      try {
        await this.redisCacheService.setJson(
          cacheKey,
          response.data,
          this.cacheTtlSeconds,
        );
      } catch {
        // Nao bloqueia a resposta quando ocorrer falha temporaria de cache.
      }

      return response.data;
    } catch (error) {
      throw new HttpException(
        'Erro ao buscar dados do GitHub',
        error.response?.status || 500
      );
    }
  }
}