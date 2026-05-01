import { Injectable } from '@nestjs/common';
import { GithubRepository } from '../github/types/github-repository.type';
import {
  CandidateScoreMetrics,
  CandidateScoreResult,
} from './types/candidate-score.type';

@Injectable()
export class ScoringService {
  private readonly activeRepoWindowDays = 90;
  private readonly recentRepoWindowDays = 30;

  calculateCandidateScore(repositories: GithubRepository[]): CandidateScoreResult {
    const metrics = this.buildMetrics(repositories);

    const activityScore = metrics.totalRepos * 2 + metrics.activeRepos * 3;
    const qualityScore = metrics.languageDiversity * 5 + metrics.totalStars;

    const totalRepos = Math.max(metrics.totalRepos, 1);
    const activeRatio = metrics.activeRepos / totalRepos;
    const recentRatio = metrics.recentRepos30d / totalRepos;
    const consistencyScore = Math.round(activeRatio * 60 + recentRatio * 40);

    const finalScore = activityScore + qualityScore + consistencyScore;

    return {
      metrics,
      scores: {
        activityScore,
        qualityScore,
        consistencyScore,
        finalScore,
      },
    };
  }

  private buildMetrics(repositories: GithubRepository[]): CandidateScoreMetrics {
    const now = Date.now();
    const activeWindowMs = this.daysToMs(this.activeRepoWindowDays);
    const recentWindowMs = this.daysToMs(this.recentRepoWindowDays);

    const activeRepos = repositories.filter((repository) => {
      const pushedAt = Date.parse(repository.pushed_at);
      return Number.isFinite(pushedAt) && now - pushedAt <= activeWindowMs;
    }).length;

    const recentRepos30d = repositories.filter((repository) => {
      const pushedAt = Date.parse(repository.pushed_at);
      return Number.isFinite(pushedAt) && now - pushedAt <= recentWindowMs;
    }).length;

    const languages = new Set(
      repositories
        .map((repository) => repository.language)
        .filter((language): language is string => Boolean(language)),
    );

    const totalStars = repositories.reduce(
      (sum, repository) => sum + repository.stargazers_count,
      0,
    );

    return {
      totalRepos: repositories.length,
      activeRepos,
      languageDiversity: languages.size,
      totalStars,
      recentRepos30d,
    };
  }

  private daysToMs(days: number): number {
    return days * 24 * 60 * 60 * 1000;
  }
}