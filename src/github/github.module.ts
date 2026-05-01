import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GithubService } from './github.service';

@Module({
  imports: [
    HttpModule.register({
      baseURL: 'https://api.github.com',
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      },
    }),
  ],
  providers: [GithubService],
  exports: [GithubService],
})
export class GithubModule {}