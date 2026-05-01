import { Injectable, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { RedisCacheService } from '../cache/redis-cache.service';
import { GithubRepository } from './types/github-repository.type';
import { ScoringService } from '../scoring/scoring.service';
import { CandidateScoreResult } from '../scoring/types/candidate-score.type';
import { CandidateAiEvaluation } from '../evaluation/types/candidate-ai-evaluation.type';
import { CandidateEvaluationService } from '../evaluation/evaluation.service';

export interface GithubCandidateScoringResponse {
  username: string;
  repositories: GithubRepository[];
  scoring: CandidateScoreResult;
}

export interface GithubCandidateEvaluationResponse {
  username: string;
  repositories: GithubRepository[];
  scoring: CandidateScoreResult;
  aiEvaluation: CandidateAiEvaluation;
}

@Injectable()
export class GithubService {
  private readonly cacheTtlSeconds: number;

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
    private readonly redisCacheService: RedisCacheService,
    private readonly scoringService: ScoringService,
    private readonly candidateEvaluationService: CandidateEvaluationService,
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

  async getCandidateScoring(
    username: string,
  ): Promise<GithubCandidateScoringResponse> {
    const repositories = await this.getUserRepository(username);

    return {
      username: username.toLowerCase(),
      repositories,
      scoring: this.scoringService.calculateCandidateScore(repositories),
    };
  }

  async getCandidateEvaluation(
    username: string,
  ): Promise<GithubCandidateEvaluationResponse> {
    const normalizedUsername = username.toLowerCase();
    const repositories = await this.getUserRepository(normalizedUsername);
    const scoring = this.scoringService.calculateCandidateScore(repositories);
    const aiEvaluation = await this.candidateEvaluationService.evaluateCandidate({
      username: normalizedUsername,
      scoring,
      repositories: repositories.map((repository) => ({
        name: repository.name,
        fullName: repository.full_name,
        language: repository.language,
        stars: repository.stargazers_count,
        forks: repository.forks_count,
        openIssues: repository.open_issues_count,
        isFork: repository.fork,
        pushedAt: repository.pushed_at,
        createdAt: repository.created_at,
        updatedAt: repository.updated_at,
      })),
    });

    return {
      username: normalizedUsername,
      repositories,
      scoring,
      aiEvaluation,
    };
  }
}