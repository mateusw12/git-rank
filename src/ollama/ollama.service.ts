import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatResponse, ListResponse, Ollama } from 'ollama';

export interface OllamaGenerationResult {
  text: string;
  model: string;
}

export interface OllamaConnectionTestResult {
  ok: boolean;
  host: string;
  configuredModels: string[];
  availableModels: string[];
  effectiveModels: string[];
  listModelsOk: boolean;
  chatTest: {
    attempted: boolean;
    model?: string;
    ok: boolean;
    responsePreview?: string;
    error?: string;
  };
  errors: string[];
}

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly modelCandidates: string[];
  private readonly host: string;
  private readonly temperature: number;
  private readonly maxOutputTokens: number;

  constructor(private readonly configService: ConfigService) {
    this.modelCandidates = this.resolveModelCandidates();
    this.host = this.configService.get<string>(
      'OLLAMA_HOST',
      'http://127.0.0.1:11434',
    );
    this.temperature = this.configService.get<number>(
      'OLLAMA_TEMPERATURE',
      0.2,
    );
    this.maxOutputTokens = this.configService.get<number>(
      'OLLAMA_MAX_OUTPUT_TOKENS',
      512,
    );
  }

  async generateJson(prompt: string): Promise<OllamaGenerationResult> {
    if (this.modelCandidates.length === 0) {
      throw new InternalServerErrorException(
        'Nenhum modelo OLLAMA configurado no ambiente',
      );
    }

    const client = this.buildClient();
    const selection = await this.resolveEffectiveModels(client);
    const modelsToTry =
      selection.effectiveModels.length > 0
        ? selection.effectiveModels
        : this.modelCandidates;

    const errors: string[] = [];

    for (const modelName of modelsToTry) {
      try {
        const response: ChatResponse = await client.chat({
          model: modelName,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          format: 'json',
          stream: false,
          options: {
            temperature: this.temperature,
            num_predict: this.maxOutputTokens,
          },
        });

        return {
          text: response.message.content,
          model: modelName,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'erro desconhecido';
        errors.push(`${modelName}: ${message}`);
        this.logger.warn(
          `Falha ao consultar Ollama com modelo ${modelName}: ${message}`,
        );
      }
    }

    throw new BadGatewayException(
      `Falha ao consultar Ollama para todos os modelos configurados: ${errors.join(' | ')}`,
    );
  }

  async testConnection(): Promise<OllamaConnectionTestResult> {
    const client = this.buildClient();
    const selection = await this.resolveEffectiveModels(client);
    const errors = [...selection.errors];
    const { listModelsOk, availableModels, effectiveModels } = selection;

    const modelToTest = effectiveModels[0] ?? undefined;

    if (!modelToTest) {
      return {
        ok: listModelsOk,
        host: this.host,
        configuredModels: this.modelCandidates,
        availableModels,
        effectiveModels,
        listModelsOk,
        chatTest: {
          attempted: false,
          ok: false,
          error: 'Nenhum modelo disponivel para teste de chat',
        },
        errors,
      };
    }

    try {
      const response: ChatResponse = await client.chat({
        model: modelToTest,
        messages: [
          {
            role: 'user',
            content: 'Responda apenas com OK.',
          },
        ],
        stream: false,
      });

      const responsePreview = response.message.content.slice(0, 120);

      return {
        ok: true,
        host: this.host,
        configuredModels: this.modelCandidates,
        availableModels,
        effectiveModels,
        listModelsOk,
        chatTest: {
          attempted: true,
          model: modelToTest,
          ok: true,
          responsePreview,
        },
        errors,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'erro desconhecido';
      errors.push(`chat(${modelToTest}): ${message}`);
      this.logger.warn(
        `Falha no teste chat() do Ollama com modelo ${modelToTest}: ${message}`,
      );

      return {
        ok: false,
        host: this.host,
        configuredModels: this.modelCandidates,
        availableModels,
        effectiveModels,
        listModelsOk,
        chatTest: {
          attempted: true,
          model: modelToTest,
          ok: false,
          error: message,
        },
        errors,
      };
    }
  }

  private buildClient(): Ollama {
    const apiKey = this.configService.get<string>('OLLAMA_API_KEY')?.trim();
    const headers = apiKey
      ? {
          Authorization: `Bearer ${apiKey}`,
        }
      : undefined;

    return new Ollama({
      host: this.host,
      headers,
    });
  }

  private async resolveEffectiveModels(client: Ollama): Promise<{
    listModelsOk: boolean;
    availableModels: string[];
    effectiveModels: string[];
    errors: string[];
  }> {
    const errors: string[] = [];
    let listModelsOk = false;
    let availableModels: string[] = [];

    try {
      const listResponse: ListResponse = await client.list();
      availableModels = this.extractModelNames(listResponse);
      listModelsOk = true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message.trim() : 'erro desconhecido';
      errors.push(`list(): ${message}`);
      this.logger.warn(`Falha ao listar modelos do Ollama: ${message}`);
    }

    if (!listModelsOk || availableModels.length === 0) {
      return {
        listModelsOk,
        availableModels,
        effectiveModels: this.modelCandidates,
        errors,
      };
    }

    const availableSet = new Set(availableModels);
    const configuredAvailable = this.modelCandidates.filter((model) =>
      availableSet.has(model),
    );

    if (configuredAvailable.length > 0) {
      return {
        listModelsOk,
        availableModels,
        effectiveModels: configuredAvailable,
        errors,
      };
    }

    return {
      listModelsOk,
      availableModels,
      effectiveModels: availableModels,
      errors,
    };
  }

  private extractModelNames(listResponse: ListResponse): string[] {
    return listResponse.models
      .map((item) => item.model ?? item.name)
      .filter(
        (item): item is string => typeof item === 'string' && item.length > 0,
      );
  }

  private resolveModelCandidates(): string[] {
    const modelsFromList = this.configService
      .get<string>('OLLAMA_MODELS', '')
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const modelFromLegacyVar = this.configService
      .get<string>('OLLAMA_MODEL', '')
      .trim();

    const defaults = ['llama3.1', 'llama3.2'];

    const merged = [
      ...modelsFromList,
      ...(modelFromLegacyVar ? [modelFromLegacyVar] : []),
      ...defaults,
    ];

    return Array.from(new Set(merged));
  }
}
