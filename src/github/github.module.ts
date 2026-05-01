import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const githubToken = configService.get<string>('GITHUB_TOKEN')?.trim();

        return {
          baseURL: 'https://api.github.com',
          headers: {
            Accept: 'application/vnd.github+json',
            ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
          },
        };
      },
    }),
  ],
  controllers: [GithubController],
  providers: [GithubService],
  exports: [GithubService],
})
export class GithubModule {}