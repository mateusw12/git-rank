import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { JobsModule } from './jobs/jobs.module';
import { RedisMemoryModule } from './queue/redis-memory.module';
import { RedisMemoryService } from './queue/redis-memory.service';

const enableBullMq = process.env.ENABLE_BULLMQ !== 'false';

@Module({
  imports: [
    DatabaseModule,
    ...(enableBullMq
      ? [
          RedisMemoryModule,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
