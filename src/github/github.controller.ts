import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { GithubService } from './github.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GithubRepository } from './types/github-repository.type';

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
}
