import { Injectable } from '@nestjs/common';
import { GithubRepository } from '../github/types/github-repository.type';
import {
  CandidateEvolutionAnalysis,
  CandidateInsights,
  CandidateTechnologyAnalysis,
} from './types/candidate-insights.type';

type Domain = 'backend' | 'frontend' | 'data';

@Injectable()
export class CandidateInsightsService {
  private readonly languageDomainMap: Record<string, Domain> = {
    typescript: 'backend',
    javascript: 'backend',
    python: 'data',
    java: 'backend',
    csharp: 'backend',
    'c#': 'backend',
    go: 'backend',
    rust: 'backend',
    php: 'backend',
    ruby: 'backend',
    kotlin: 'backend',
    swift: 'frontend',
    dart: 'frontend',
    html: 'frontend',
    css: 'frontend',
    scss: 'frontend',
    vue: 'frontend',
    svelte: 'frontend',
    r: 'data',
    scala: 'data',
    julia: 'data',
    sql: 'data',
    notebook: 'data',
  };

  private readonly stackDetectors: Array<{
    stack: string;
    matches: string[];
  }> = [
    { stack: 'Node.js', matches: ['node', 'nodejs', 'npm'] },
    { stack: 'NestJS', matches: ['nestjs', 'nest'] },
    { stack: 'Express', matches: ['express'] },
    { stack: 'Fastify', matches: ['fastify'] },
    { stack: 'Next.js', matches: ['nextjs', 'next.js'] },
    { stack: 'React', matches: ['react'] },
    { stack: 'Vue', matches: ['vue'] },
    { stack: 'Angular', matches: ['angular'] },
    { stack: 'Python', matches: ['python'] },
    { stack: 'Django', matches: ['django'] },
    { stack: 'Flask', matches: ['flask'] },
    { stack: 'MongoDB', matches: ['mongodb', 'mongo'] },
    { stack: 'PostgreSQL', matches: ['postgres', 'postgresql'] },
    { stack: 'MySQL', matches: ['mysql'] },
    { stack: 'Redis', matches: ['redis'] },
    { stack: 'Docker', matches: ['docker'] },
    { stack: 'Kubernetes', matches: ['kubernetes', 'k8s'] },
  ];

  buildInsights(repositories: GithubRepository[]): CandidateInsights {
    return {
      technology: this.buildTechnologyAnalysis(repositories),
      evolution: this.buildEvolutionAnalysis(repositories),
    };
  }

  private buildTechnologyAnalysis(
    repositories: GithubRepository[],
  ): CandidateTechnologyAnalysis {
    const languageCount = new Map<string, number>();
    const domainScore = {
      backend: 0,
      frontend: 0,
      data: 0,
    };
    const stackScore = new Map<string, number>();

    for (const repository of repositories) {
      const language = (repository.language ?? '').trim();
      const normalizedLanguage = language.toLowerCase();

      if (language) {
        languageCount.set(language, (languageCount.get(language) ?? 0) + 1);
      }

      const domain = this.languageDomainMap[normalizedLanguage];

      if (domain) {
        domainScore[domain] += 1;
      }

      const searchable = this.buildSearchableContent(repository);

      for (const detector of this.stackDetectors) {
        const matched = detector.matches.some((token) => searchable.includes(token));

        if (matched) {
          stackScore.set(detector.stack, (stackScore.get(detector.stack) ?? 0) + 1);
        }
      }
    }

    const dominantLanguages = Array.from(languageCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([language, repositoriesCount]) => ({
        language,
        repositories: repositoriesCount,
      }));

    const stack = Array.from(stackScore.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    if (stack.length === 0 && dominantLanguages.length > 0) {
      stack.push(dominantLanguages[0].language);
    }

    const profile = this.resolveProfile(domainScore, stack, dominantLanguages);

    return {
      profile,
      stack,
      dominantLanguages,
      domains: domainScore,
    };
  }

  private buildEvolutionAnalysis(
    repositories: GithubRepository[],
  ): CandidateEvolutionAnalysis {
    const usableRepositories = repositories
      .filter((repository) => !repository.fork)
      .filter((repository) => Boolean(repository.created_at))
      .slice();

    if (usableRepositories.length < 2) {
      return {
        isImproving: false,
        trend: 'stable',
        oldProjectsAverageScore: 0,
        recentProjectsAverageScore: 0,
        deltaScore: 0,
        summary: 'Sem historico suficiente para comparar evolucao de projetos',
      };
    }

    usableRepositories.sort(
      (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
    );

    const middle = Math.floor(usableRepositories.length / 2);
    const oldProjects = usableRepositories.slice(0, middle);
    const recentProjects = usableRepositories.slice(middle);

    const oldAverage = this.averageRepositoryQuality(oldProjects);
    const recentAverage = this.averageRepositoryQuality(recentProjects);
    const deltaScore = Number((recentAverage - oldAverage).toFixed(2));

    const trend = this.resolveTrend(deltaScore);

    return {
      isImproving: trend === 'improving',
      trend,
      oldProjectsAverageScore: oldAverage,
      recentProjectsAverageScore: recentAverage,
      deltaScore,
      summary: this.buildEvolutionSummary(trend, deltaScore),
    };
  }

  private averageRepositoryQuality(repositories: GithubRepository[]): number {
    if (repositories.length === 0) {
      return 0;
    }

    const scores = repositories.map((repository) => {
      const stars = repository.stargazers_count;
      const forks = repository.forks_count;
      const recencyBoost = this.recencyBoost(repository.pushed_at);
      const issuePenalty = Math.min(repository.open_issues_count, 30) * 0.3;

      const quality = stars * 2 + forks * 1.2 + recencyBoost - issuePenalty;
      return Math.max(0, quality);
    });

    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return Number(average.toFixed(2));
  }

  private recencyBoost(pushedAt: string): number {
    const pushedAtTimestamp = Date.parse(pushedAt);

    if (!Number.isFinite(pushedAtTimestamp)) {
      return 0;
    }

    const days = (Date.now() - pushedAtTimestamp) / (24 * 60 * 60 * 1000);

    if (days <= 30) {
      return 15;
    }

    if (days <= 90) {
      return 8;
    }

    if (days <= 180) {
      return 4;
    }

    return 0;
  }

  private resolveTrend(
    deltaScore: number,
  ): 'improving' | 'stable' | 'declining' {
    if (deltaScore >= 8) {
      return 'improving';
    }

    if (deltaScore <= -8) {
      return 'declining';
    }

    return 'stable';
  }

  private buildEvolutionSummary(
    trend: 'improving' | 'stable' | 'declining',
    deltaScore: number,
  ): string {
    if (trend === 'improving') {
      return `Projetos recentes mostram evolucao positiva (delta ${deltaScore})`;
    }

    if (trend === 'declining') {
      return `Projetos recentes estao abaixo dos antigos (delta ${deltaScore})`;
    }

    return `Qualidade de projetos manteve estabilidade (delta ${deltaScore})`;
  }

  private resolveProfile(
    domains: { backend: number; frontend: number; data: number },
    stack: string[],
    dominantLanguages: Array<{ language: string; repositories: number }>,
  ): string {
    const ordered = [
      { name: 'backend', score: domains.backend },
      { name: 'frontend', score: domains.frontend },
      { name: 'data', score: domains.data },
    ].sort((a, b) => b.score - a.score);

    const primaryDomain = ordered[0];

    if (primaryDomain.score === 0) {
      return 'Generalista';
    }

    const stackLabel = stack[0] ?? dominantLanguages[0]?.language ?? '';

    if (primaryDomain.name === 'backend') {
      return stackLabel ? `Backend ${stackLabel}` : 'Backend';
    }

    if (primaryDomain.name === 'frontend') {
      return stackLabel ? `Frontend ${stackLabel}` : 'Frontend';
    }

    return stackLabel ? `Data ${stackLabel}` : 'Data';
  }

  private buildSearchableContent(repository: GithubRepository): string {
    const topicBlock = repository.topics.join(' ');

    return [
      repository.name,
      repository.full_name,
      repository.description ?? '',
      repository.language ?? '',
      topicBlock,
    ]
      .join(' ')
      .toLowerCase();
  }
}