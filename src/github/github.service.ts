import { Injectable, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { isAxiosError } from 'axios';
import { RedisCacheService } from '../cache/redis-cache.service';
import { GithubRepository } from './types/github-repository.type';
import { ScoringService } from '../scoring/scoring.service';
import { CandidateScoreResult } from '../scoring/types/candidate-score.type';
import { CandidateAiEvaluation } from '../evaluation/types/candidate-ai-evaluation.type';
import { CandidateEvaluationService } from '../evaluation/evaluation.service';
import {
  CommitActivitySample,
  GithubCommitDetail,
  GithubCommitListItem,
} from './types/github-commit.type';
import { CommitAnalysisService } from '../commit-analysis/commit-analysis.service';
import { RepositoryCommitAnalysisResponse } from '../commit-analysis/types/commit-analysis.type';
import { CandidateInsightsService } from '../candidate-insights/candidate-insights.service';
import { CandidateInsights } from '../candidate-insights/types/candidate-insights.type';

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

export interface GithubCandidateInsightsResponse {
  username: string;
  repositories: GithubRepository[];
  scoring: CandidateScoreResult;
  insights: CandidateInsights;
}

export interface GithubCandidateEvaluationSummary {
  username: string;
  scoring: CandidateScoreResult['scores'];
  aiEvaluation: CandidateAiEvaluation;
  profile: string;
  stack: string[];
  evolution: CandidateInsights['evolution'];
}

export interface GithubBatchCandidateEvaluationItem {
  username: string;
  status: 'ok' | 'error';
  summary?: GithubCandidateEvaluationSummary;
  error?: string;
}

export interface GithubBatchCandidateEvaluationResponse {
  totalRequested: number;
  totalProcessed: number;
  totalSucceeded: number;
  totalFailed: number;
  results: GithubBatchCandidateEvaluationItem[];
}

@Injectable()
export class GithubService {
  private readonly repositoryCacheTtlSeconds: number;
  private readonly commitAnalysisCacheTtlSeconds: number;
  private readonly commitsFetchLimit: number;
  private readonly commitsStatsLimit: number;
  private readonly batchEvaluationConcurrency: number;

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
    private readonly redisCacheService: RedisCacheService,
    private readonly scoringService: ScoringService,
    private readonly candidateEvaluationService: CandidateEvaluationService,
    private readonly commitAnalysisService: CommitAnalysisService,
    private readonly candidateInsightsService: CandidateInsightsService,
  ) {
    this.repositoryCacheTtlSeconds = this.configService.get<number>(
      'GITHUB_REPOS_CACHE_TTL_SECONDS',
      300,
    );
    this.commitAnalysisCacheTtlSeconds = this.configService.get<number>(
      'GITHUB_COMMITS_CACHE_TTL_SECONDS',
      600,
    );
    this.commitsFetchLimit = this.configService.get<number>(
      'GITHUB_COMMITS_FETCH_LIMIT',
      100,
    );
    this.commitsStatsLimit = this.configService.get<number>(
      'GITHUB_COMMITS_STATS_LIMIT',
      25,
    );
    this.batchEvaluationConcurrency = this.configService.get<number>(
      'GITHUB_BATCH_EVALUATION_CONCURRENCY',
      4,
    );
  }

  async getUserRepository(username: string): Promise<GithubRepository[]> {
    const normalizedUsername = username.toLowerCase();
    const cacheKey = `github:repos:${normalizedUsername}`;

    try {
      const cached =
        await this.redisCacheService.getJson<GithubRepository[]>(cacheKey);

      if (cached) {
        return cached;
      }
    } catch {
      // Nao bloqueia a rota quando ocorrer falha temporaria de cache.
    }

    try {
      const response = await firstValueFrom(
        this.http.get<GithubRepository[]>(`/users/${normalizedUsername}/repos`),
      );

      try {
        await this.redisCacheService.setJson(
          cacheKey,
          response.data,
          this.repositoryCacheTtlSeconds,
        );
      } catch {
        // Nao bloqueia a resposta quando ocorrer falha temporaria de cache.
      }

      return response.data;
    } catch (error) {
      throw new HttpException(
        'Erro ao buscar dados do GitHub',
        this.resolveHttpStatusFromUnknownError(error),
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
    const aiEvaluation =
      await this.candidateEvaluationService.evaluateCandidate(
        this.buildCandidateEvaluationPayload(
          normalizedUsername,
          repositories,
          scoring,
        ),
      );

    return {
      username: normalizedUsername,
      repositories,
      scoring,
      aiEvaluation,
    };
  }

  async getCandidateInsights(
    username: string,
  ): Promise<GithubCandidateInsightsResponse> {
    const normalizedUsername = username.toLowerCase();
    const repositories = await this.getUserRepository(normalizedUsername);
    const scoring = this.scoringService.calculateCandidateScore(repositories);

    return {
      username: normalizedUsername,
      repositories,
      scoring,
      insights: this.candidateInsightsService.buildInsights(repositories),
    };
  }

  async getBatchCandidateEvaluationSummary(
    usernames: string[],
  ): Promise<GithubBatchCandidateEvaluationResponse> {
    const normalizedUsernames = Array.from(
      new Set(
        usernames
          .map((username) => username.trim().toLowerCase())
          .filter((username) => username.length > 0),
      ),
    );

    const tasks = normalizedUsernames.map((username) => async () => {
      try {
        const summary = await this.buildCandidateSummary(username);
        return {
          username,
          status: 'ok' as const,
          summary,
        };
      } catch (error) {
        return {
          username,
          status: 'error' as const,
          error:
            error instanceof Error
              ? error.message
              : 'Falha inesperada ao avaliar candidato',
        };
      }
    });

    const results = await this.runWithConcurrency(
      tasks,
      Math.max(1, this.batchEvaluationConcurrency),
    );

    const totalSucceeded = results.filter(
      (item) => item.status === 'ok',
    ).length;

    return {
      totalRequested: usernames.length,
      totalProcessed: normalizedUsernames.length,
      totalSucceeded,
      totalFailed: results.length - totalSucceeded,
      results,
    };
  }

  async getRepositoryCommitAnalysis(
    owner: string,
    repository: string,
  ): Promise<RepositoryCommitAnalysisResponse> {
    const normalizedOwner = owner.toLowerCase();
    const normalizedRepository = repository.toLowerCase();
    const cacheKey = `github:commits:analysis:${normalizedOwner}:${normalizedRepository}`;

    try {
      const cached =
        await this.redisCacheService.getJson<RepositoryCommitAnalysisResponse>(
          cacheKey,
        );

      if (cached) {
        return cached;
      }
    } catch {
      // Nao bloqueia a rota quando ocorrer falha temporaria de cache.
    }

    try {
      const commitsResponse = await firstValueFrom(
        this.http.get<GithubCommitListItem[]>(
          `/repos/${normalizedOwner}/${normalizedRepository}/commits`,
          {
            params: {
              per_page: this.commitsFetchLimit,
            },
          },
        ),
      );

      const commits = commitsResponse.data;
      const detailedCommits = await this.fetchCommitDetails(
        normalizedOwner,
        normalizedRepository,
        commits,
      );
      const latestCommits = detailedCommits.slice(0, 10);

      const response: RepositoryCommitAnalysisResponse = {
        owner: normalizedOwner,
        repository: normalizedRepository,
        generatedAt: new Date().toISOString(),
        analysis: this.commitAnalysisService.analyze(detailedCommits),
        samples: {
          commitsFetched: commits.length,
          commitsWithStats: detailedCommits.length,
          latestCommits,
        },
      };

      try {
        await this.redisCacheService.setJson(
          cacheKey,
          response,
          this.commitAnalysisCacheTtlSeconds,
        );
      } catch {
        // Nao bloqueia a resposta quando ocorrer falha temporaria de cache.
      }

      return response;
    } catch (error) {
      throw new HttpException(
        'Erro ao buscar commits do repositorio no GitHub',
        this.resolveHttpStatusFromUnknownError(error),
      );
    }
  }

  private async fetchCommitDetails(
    owner: string,
    repository: string,
    commits: GithubCommitListItem[],
  ): Promise<CommitActivitySample[]> {
    const slice = commits.slice(0, this.commitsStatsLimit);

    const detailed = await Promise.all(
      slice.map(async (commit) => {
        try {
          const detailResponse = await firstValueFrom(
            this.http.get<GithubCommitDetail>(
              `/repos/${owner}/${repository}/commits/${commit.sha}`,
            ),
          );
          const stats = detailResponse.data.stats;

          return {
            sha: commit.sha,
            authoredAt: commit.commit.author.date,
            message: commit.commit.message,
            totalChanges: stats?.total ?? 0,
            additions: stats?.additions ?? 0,
            deletions: stats?.deletions ?? 0,
          } satisfies CommitActivitySample;
        } catch {
          return {
            sha: commit.sha,
            authoredAt: commit.commit.author.date,
            message: commit.commit.message,
            totalChanges: 0,
            additions: 0,
            deletions: 0,
          } satisfies CommitActivitySample;
        }
      }),
    );

    return detailed;
  }

  private async buildCandidateSummary(
    username: string,
  ): Promise<GithubCandidateEvaluationSummary> {
    const repositories = await this.getUserRepository(username);
    const scoring = this.scoringService.calculateCandidateScore(repositories);
    const aiEvaluation =
      await this.candidateEvaluationService.evaluateCandidate(
        this.buildCandidateEvaluationPayload(username, repositories, scoring),
      );
    const insights = this.candidateInsightsService.buildInsights(repositories);

    return {
      username,
      scoring: scoring.scores,
      aiEvaluation,
      profile: insights.technology.profile,
      stack: insights.technology.stack,
      evolution: insights.evolution,
    };
  }

  private buildCandidateEvaluationPayload(
    username: string,
    repositories: GithubRepository[],
    scoring: CandidateScoreResult,
  ): {
    username: string;
    scoring: CandidateScoreResult;
    repositories: Array<{
      name: string;
      fullName: string;
      language: string | null;
      stars: number;
      forks: number;
      openIssues: number;
      isFork: boolean;
      pushedAt: string;
      createdAt: string;
      updatedAt: string;
    }>;
  } {
    return {
      username,
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
    };
  }

  private async runWithConcurrency<T>(
    tasks: Array<() => Promise<T>>,
    concurrency: number,
  ): Promise<T[]> {
    const safeConcurrency = Math.min(
      Math.max(concurrency, 1),
      tasks.length || 1,
    );
    const results: Array<T | undefined> = Array.from(
      { length: tasks.length },
      () => undefined,
    );
    let currentIndex = 0;

    const worker = async (): Promise<void> => {
      while (currentIndex < tasks.length) {
        const taskIndex = currentIndex;
        currentIndex += 1;
        results[taskIndex] = await tasks[taskIndex]();
      }
    };

    await Promise.all(Array.from({ length: safeConcurrency }, () => worker()));

    return results.map((item) => {
      if (item === undefined) {
        throw new Error('Falha ao processar tarefa em lote');
      }

      return item;
    });
  }

  private resolveHttpStatusFromUnknownError(error: unknown): number {
    if (isAxiosError(error)) {
      return error.response?.status ?? 500;
    }

    return 500;
  }
}
