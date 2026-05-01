import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateJobDto } from './dto/create-job.dto';
import { JobsService } from './jobs.service';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @ApiOperation({ summary: 'Adiciona um novo job na fila em memoria' })
  @ApiCreatedResponse({ description: 'Job enfileirado com sucesso.' })
  create(@Body() body: CreateJobDto) {
    return this.jobsService.enqueue(body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca um job salvo na camada de database em memoria' })
  @ApiParam({ name: 'id', description: 'ID interno da camada de database' })
  @ApiOkResponse({ description: 'Job encontrado com estado atual da fila.' })
  @ApiNotFoundResponse({ description: 'Job nao encontrado.' })
  findOne(@Param('id') id: string) {
    return this.jobsService.getById(id);
  }
}
