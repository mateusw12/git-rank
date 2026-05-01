import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { DatabaseService } from '../database/database.service';
import { CreateJobDto } from './dto/create-job.dto';

type JobRecord = {
  queueJobId: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

@Injectable()
export class JobsService {
  constructor(
    @InjectQueue('jobs') private readonly jobsQueue: Queue,
    private readonly databaseService: DatabaseService,
  ) {}

  async enqueue(dto: CreateJobDto): Promise<{ id: string; queueJobId: string }> {
    const payload = dto.payload ?? {};
    const queueJob = await this.jobsQueue.add(dto.type, payload);

    const created = this.databaseService.insert<JobRecord>('jobs', {
      queueJobId: String(queueJob.id),
      type: dto.type,
      payload,
      createdAt: new Date().toISOString(),
    });

    return {
      id: created.id,
      queueJobId: created.queueJobId,
    };
  }

  async getById(id: string): Promise<{
    id: string;
    type: string;
    payload: Record<string, unknown>;
    createdAt: string;
    queueJobId: string;
    state: string;
    result: unknown;
  }> {
    const record = this.databaseService.findById<JobRecord>('jobs', id);

    if (!record) {
      throw new NotFoundException(`Job ${id} not found`);
    }

    const queueJob: Job | undefined = await this.jobsQueue.getJob(record.queueJobId);
    const state = queueJob ? await queueJob.getState() : 'unknown';
    const result = queueJob?.returnvalue ?? null;

    return {
      ...record,
      state,
      result,
    };
  }
}
