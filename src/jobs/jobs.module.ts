import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { JobsProcessor } from './jobs.processor';

const enableWorker = process.env.DISABLE_BULL_WORKER !== 'true';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'jobs',
    }),
  ],
  controllers: [JobsController],
  providers: [JobsService, ...(enableWorker ? [JobsProcessor] : [])],
})
export class JobsModule {}
