import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { GithubService } from './github.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GithubRepository } from './types/github-repository.type';
import {
  GithubBatchCandidateEvaluationResponse,
  GithubCandidateEvaluationResponse,
  GithubCandidateInsightsResponse,
  GithubCandidateScoringResponse,
} from './github.service';
import { RepositoryCommitAnalysisResponse } from '../commit-analysis/types/commit-analysis.type';
import { BatchCandidateEvaluationDto } from './dto/batch-candidate-evaluation.dto';

@ApiTags('github')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('github')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  @ApiOperation({
    summary: 'Busca os repositórios públicos de um usuário do GitHub',
  })
  @Get(':username/repos')
  async getRepository(@Param('username') username: string): Promise<GithubRepository[]> {
    return this.githubService.getUserRepository(username);
  }

  @ApiOperation({
    summary: 'Busca os repositórios e calcula score do candidato',
  })
  @Get(':username/score')
  async getCandidateScore(
    @Param('username') username: string,
  ): Promise<GithubCandidateScoringResponse> {
    return this.githubService.getCandidateScoring(username);
  }

  @ApiOperation({
    summary: 'Busca os dados do GitHub e faz avaliacao IA do candidato',
  })
  @Get(':username/evaluation')
  async getCandidateEvaluation(
    @Param('username') username: string,
  ): Promise<GithubCandidateEvaluationResponse> {
    return this.githubService.getCandidateEvaluation(username);
  }

  @ApiOperation({
    summary:
      'Gera insights de tecnologia e evolucao do candidato com base nos repositorios',
  })
  @Get(':username/insights')
  async getCandidateInsights(
    @Param('username') username: string,
  ): Promise<GithubCandidateInsightsResponse> {
    return this.githubService.getCandidateInsights(username);
  }

  @ApiOperation({
    summary:
      'Analisa commits de um repositorio (frequencia, horarios e tamanho medio)',
  })
  @Get('repos/:owner/:repo/commits')
  async getRepositoryCommitsAnalysis(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
  ): Promise<RepositoryCommitAnalysisResponse> {
    return this.githubService.getRepositoryCommitAnalysis(owner, repo);
  }

  @ApiOperation({
    summary:
      'Avalia varios candidatos do GitHub em lote e retorna apenas resumo (sem lista de repositorios)',
  })
  @Post('evaluations/batch')
  async getBatchCandidateEvaluations(
    @Body() dto: BatchCandidateEvaluationDto,
  ): Promise<GithubBatchCandidateEvaluationResponse> {
    return this.githubService.getBatchCandidateEvaluationSummary(dto.usernames);
  }
}
