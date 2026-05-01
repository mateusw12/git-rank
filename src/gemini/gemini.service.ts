import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeminiGenerationResult {
  text: string;
  model: string;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly modelCandidates: string[];
  private readonly temperature: number;
  private readonly maxOutputTokens: number;

  constructor(private readonly configService: ConfigService) {
    this.modelCandidates = this.resolveModelCandidates();
    this.temperature = this.configService.get<number>('GEMINI_TEMPERATURE', 0.2);
    this.maxOutputTokens = this.configService.get<number>(
      'GEMINI_MAX_OUTPUT_TOKENS',
      512,
    );
  }

  async generateJson(prompt: string): Promise<GeminiGenerationResult> {
    const apiKey = this.configService.get<string>('GOOGLE_API_KEY')?.trim();

    if (!apiKey) {
      throw new InternalServerErrorException(
        'GOOGLE_API_KEY nao configurada no ambiente',
      );
    }

    const client = new GoogleGenerativeAI(apiKey);
    const errors: string[] = [];

    for (const modelName of this.modelCandidates) {
      const model = client.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: this.temperature,
          maxOutputTokens: this.maxOutputTokens,
        },
      });

      try {
        const result = await model.generateContent(prompt);

        return {
          text: result.response.text(),
          model: modelName,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'erro desconhecido';
        errors.push(`${modelName}: ${message}`);
        this.logger.warn(`Falha ao consultar Gemini com modelo ${modelName}: ${message}`);
      }
    }

    throw new BadGatewayException(
      `Falha ao consultar Gemini para todos os modelos configurados: ${errors.join(' | ')}`,
    );
  }

  private resolveModelCandidates(): string[] {
    const modelsFromList = this.configService
      .get<string>('GEMINI_MODELS', '')
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const modelFromLegacyVar = this.configService.get<string>('GEMINI_MODEL', '').trim();

    const defaults = [
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
    ];

    const merged = [
      ...modelsFromList,
      ...(modelFromLegacyVar ? [modelFromLegacyVar] : []),
      ...defaults,
    ];

    return Array.from(new Set(merged));
  }
}