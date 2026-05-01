import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { OllamaService } from './ollama.service';
import { OllamaConnectionTestResponseDto } from './dto/ollama-connection-test-response.dto';

@ApiTags('ollama')
@Controller('ollama')
export class OllamaController {
  constructor(private readonly ollamaService: OllamaService) {}

  @Public()
  @ApiOperation({
    summary:
      'Testa conectividade com Ollama (host, listagem de modelos e chat)',
  })
  @ApiOkResponse({ type: OllamaConnectionTestResponseDto })
  @Get('test')
  async testConnection(): Promise<OllamaConnectionTestResponseDto> {
    return this.ollamaService.testConnection();
  }
}
