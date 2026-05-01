import { ApiProperty } from '@nestjs/swagger';

export class OllamaChatTestDto {
  @ApiProperty({ example: true })
  attempted!: boolean;

  @ApiProperty({ required: false, example: 'llama3.1' })
  model?: string;

  @ApiProperty({ example: true })
  ok!: boolean;

  @ApiProperty({ required: false, example: 'OK' })
  responsePreview?: string;

  @ApiProperty({ required: false, example: 'model not found' })
  error?: string;
}

export class OllamaConnectionTestResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;

  @ApiProperty({ example: 'https://ollama.com' })
  host!: string;

  @ApiProperty({ type: [String], example: ['llama3.1', 'llama3.2'] })
  configuredModels!: string[];

  @ApiProperty({ type: [String], example: ['gpt-oss:20b', 'gemma3:12b'] })
  availableModels!: string[];

  @ApiProperty({ type: [String], example: ['gpt-oss:20b'] })
  effectiveModels!: string[];

  @ApiProperty({ example: true })
  listModelsOk!: boolean;

  @ApiProperty({ type: OllamaChatTestDto })
  chatTest!: OllamaChatTestDto;

  @ApiProperty({ type: [String], example: [] })
  errors!: string[];
}
