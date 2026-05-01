import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { DatabaseModule } from './database/database.module';
import { JobsModule } from './jobs/jobs.module';
import { RedisMemoryModule } from './queue/redis-memory.module';
import { RedisMemoryService } from './queue/redis-memory.service';
import { GithubModule } from './github/github.module';
import { ScoringModule } from './scoring/scoring.module';
import { EvaluationModule } from './evaluation/evaluation.module';

const enableBullMq = process.env.ENABLE_BULLMQ !== 'false';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    RedisMemoryModule,
    CacheModule,
    ...(enableBullMq
      ? [
          BullModule.forRootAsync({
            imports: [RedisMemoryModule],
            inject: [RedisMemoryService],
            useFactory: async (redisMemoryService: RedisMemoryService) => ({
              connection: await redisMemoryService.getConnection(),
            }),
          }),
          JobsModule,
        ]
      : []),
    AuthModule,
    ScoringModule,
    EvaluationModule,
    GithubModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
