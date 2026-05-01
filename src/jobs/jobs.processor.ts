import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('jobs')
export class JobsProcessor extends WorkerHost {
  async process(job: Job<Record<string, unknown>, unknown, string>): Promise<unknown> {
    return {
      processedAt: new Date().toISOString(),
      type: job.name,
      payload: job.data,
      message: 'Job processado com sucesso em memoria',
    };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    // Hook simples para futuras integrações de observabilidade.
    console.log(`Job ${job.id} concluido`);
  }
}
