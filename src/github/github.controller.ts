import { Controller, Get, Param } from '@nestjs/common';
import { GithubService } from './github.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('github')
@Controller('github')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  @ApiOperation({
    summary: 'Busca os repositórios públicos de um usuário do GitHub',
  })
  @Get(':username/repos')
  async getRepository(@Param('username') username: string) {
    return this.githubService.getUserRepository(username);
  }
}
