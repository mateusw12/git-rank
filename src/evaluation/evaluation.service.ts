import {
  BadGatewayException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisCacheService } from '../cache/redis-cache.service';
import {
  CandidateAiEvaluation,
  CandidateEvaluationInput,
  CandidateLevel,
  StoredCandidateAiEvaluation,
} from './types/candidate-ai-evaluation.type';
import { CandidateEvaluationStore } from './store/candidate-evaluation.store';
import { GeminiService } from '../gemini/gemini.service';

@Injectable()
export class CandidateEvaluationService {
  private readonly logger = new Logger(CandidateEvaluationService.name);
  private readonly cacheTtlSeconds: number;
  private readonly maxRepositoriesForPrompt: number;
  private readonly maxTextFieldLength: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisCacheService: RedisCacheService,
    private readonly candidateEvaluationStore: CandidateEvaluationStore,
    private readonly geminiService: GeminiService,
  ) {
    this.cacheTtlSeconds = this.configService.get<number>(
      'GEMINI_EVALUATION_CACHE_TTL_SECONDS',
      21600,
    );
    this.maxRepositoriesForPrompt = this.configService.get<number>(
      'GEMINI_MAX_REPOSITORIES',
      12,
    );
    this.maxTextFieldLength = this.configService.get<number>(
      'GEMINI_MAX_TEXT_FIELD_LENGTH',
      120,
    );
  }

  async evaluateCandidate(input: CandidateEvaluationInput): Promise<CandidateAiEvaluation> {
    const username = input.username.toLowerCase();

    const fromDictionary = this.getFromDictionary(username);

    if (fromDictionary) {
      return fromDictionary;
    }

    const cacheKey = `gemini:evaluation:${username}`;

    try {
      const fromRedis = await this.redisCacheService.getJson<StoredCandidateAiEvaluation>(
        cacheKey,
      );

      if (fromRedis && this.isNotExpired(fromRedis.cacheUntil)) {
        this.candidateEvaluationStore.set(fromRedis);
        return fromRedis.value;
      }
    } catch {
      // Nao bloqueia a avaliacao quando ocorrer falha temporaria de cache.
    }

    const generated = await this.generateWithFallback(input);
    const stored: StoredCandidateAiEvaluation = {
      username,
      cacheUntil: new Date(Date.now() + this.cacheTtlSeconds * 1000).toISOString(),
      value: generated,
    };

    this.candidateEvaluationStore.set(stored);

    try {
      await this.redisCacheService.setJson(cacheKey, stored, this.cacheTtlSeconds);
    } catch {
      // Nao bloqueia a resposta quando ocorrer falha temporaria de cache.
    }

    return generated;
  }

  private getFromDictionary(username: string): CandidateAiEvaluation | null {
    const stored = this.candidateEvaluationStore.get(username);

    if (!stored || !this.isNotExpired(stored.cacheUntil)) {
      return null;
    }

    return stored.value;
  }

  private isNotExpired(cacheUntil: string): boolean {
    const expiresAt = Date.parse(cacheUntil);

    if (!Number.isFinite(expiresAt)) {
      return false;
    }

    return Date.now() <= expiresAt;
  }

  private async generateWithFallback(
    input: CandidateEvaluationInput,
  ): Promise<CandidateAiEvaluation> {
    try {
      return await this.generateWithGemini(input);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'erro desconhecido';
      this.logger.warn(
        `Gemini indisponivel para ${input.username}. Aplicando fallback heuristico. Motivo: ${reason}`,
      );
      return this.generateHeuristicEvaluation(input);
    }
  }

  private async generateWithGemini(
    input: CandidateEvaluationInput,
  ): Promise<CandidateAiEvaluation> {
    const prompt = this.buildPrompt(input);
    const result = await this.geminiService.generateJson(prompt);
    return this.parseModelResponse(result.text, result.model);
  }

  private generateHeuristicEvaluation(
    input: CandidateEvaluationInput,
  ): CandidateAiEvaluation {
    const { metrics, scores } = input.scoring;

    const activityNormalized = this.normalizeScore(scores.activityScore, 120);
    const qualityNormalized = this.normalizeScore(scores.qualityScore, 140);
    const consistencyNormalized = this.normalizeScore(scores.consistencyScore, 100);

    const finalScore = Math.round(
      activityNormalized * 0.35 +
        qualityNormalized * 0.4 +
        consistencyNormalized * 0.25,
    );

    const level = this.resolveLevel(finalScore);
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (metrics.activeRepos >= 4) {
      strengths.push('Boa frequencia de atividade recente em repositorios');
    } else {
      weaknesses.push('Baixa frequencia de atividade recente');
    }

    if (metrics.languageDiversity >= 3) {
      strengths.push('Diversidade de linguagens acima da media');
    } else {
      weaknesses.push('Diversidade tecnica limitada entre linguagens');
    }

    if (metrics.totalStars >= 20) {
      strengths.push('Projetos com boa tracao de comunidade (stars)');
    } else {
      weaknesses.push('Baixo reconhecimento publico dos projetos (stars)');
    }

    if (metrics.totalRepos >= 8) {
      strengths.push('Volume de repositorios consistente para avaliacao');
    } else {
      weaknesses.push('Historico de repositorios ainda pequeno');
    }

    return {
      score: Math.max(0, Math.min(100, finalScore)),
      level,
      strengths: strengths.slice(0, 4),
      weaknesses: weaknesses.slice(0, 4),
      evaluatedAt: new Date().toISOString(),
      model: 'heuristic-fallback-v1',
    };
  }

  private normalizeScore(value: number, reference: number): number {
    if (reference <= 0) {
      return 0;
    }

    const percentage = (value / reference) * 100;
    return Math.max(0, Math.min(100, percentage));
  }

  private resolveLevel(score: number): CandidateLevel {
    if (score >= 75) {
      return 'Senior';
    }

    if (score >= 45) {
      return 'Pleno';
    }

    return 'Junior';
  }

  private buildPrompt(input: CandidateEvaluationInput): string {
    const repositoriesForPrompt = input.repositories
      .slice()
      .sort((a, b) => b.stars - a.stars)
      .slice(0, this.maxRepositoriesForPrompt)
      .map((repository) => ({
        name: this.truncate(repository.name),
        fullName: this.truncate(repository.fullName),
        language: repository.language,
        stars: repository.stars,
        forks: repository.forks,
        openIssues: repository.openIssues,
        isFork: repository.isFork,
        pushedAt: repository.pushedAt,
      }));

    const data = {
      username: input.username,
      scoring: {
        metrics: input.scoring.metrics,
        scores: input.scoring.scores,
      },
      repositoriesCount: input.repositories.length,
      repositoriesSample: repositoriesForPrompt,
    };

    return `
Voce e um recrutador tecnico senior.

Criterios de avaliacao:
- Qualidade dos projetos
- Frequencia de atividade
- Complexidade
- Uso de boas praticas

Dados do candidato:
${JSON.stringify(data, null, 2)}

Retorne JSON valido e sem markdown:
{
  "score": 0-100,
  "level": "Junior | Pleno | Senior",
  "strengths": ["..."],
  "weaknesses": ["..."]
}
`;
  }

  private parseModelResponse(text: string, modelName: string): CandidateAiEvaluation {
    const jsonPayload = this.extractJsonPayload(text);

    let parsed: unknown;

    try {
      parsed = JSON.parse(jsonPayload);
    } catch {
      throw new BadGatewayException('Gemini retornou JSON invalido');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new BadGatewayException('Gemini retornou payload inesperado');
    }

    const payload = parsed as {
      score?: unknown;
      level?: unknown;
      strengths?: unknown;
      weaknesses?: unknown;
    };

    const numericScore = Number(payload.score);
    const score = Number.isFinite(numericScore)
      ? Math.max(0, Math.min(100, Math.round(numericScore)))
      : 0;
    const level = this.normalizeLevel(payload.level);
    const strengths = this.normalizeStringArray(payload.strengths);
    const weaknesses = this.normalizeStringArray(payload.weaknesses);

    return {
      score,
      level,
      strengths,
      weaknesses,
      evaluatedAt: new Date().toISOString(),
      model: modelName,
    };
  }

  private truncate(value: string): string {
    if (value.length <= this.maxTextFieldLength) {
      return value;
    }

    return `${value.slice(0, this.maxTextFieldLength)}...`;
  }

  private extractJsonPayload(text: string): string {
    const codeFenceMatch = text.match(/```json\s*([\s\S]*?)```/i);

    if (codeFenceMatch && codeFenceMatch[1]) {
      return codeFenceMatch[1].trim();
    }

    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');

    if (start >= 0 && end > start) {
      return text.slice(start, end + 1);
    }

    throw new BadGatewayException('Gemini nao retornou um JSON detectavel');
  }

  private normalizeLevel(value: unknown): CandidateLevel {
    if (typeof value !== 'string') {
      return 'Junior';
    }

    const normalized = value.trim().toLowerCase();

    if (normalized === 'senior') {
      return 'Senior';
    }

    if (normalized === 'pleno') {
      return 'Pleno';
    }

    return 'Junior';
  }

  private normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .slice(0, 10);
  }
}