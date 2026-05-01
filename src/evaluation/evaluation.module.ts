import { Module } from '@nestjs/common';
import { CandidateEvaluationService } from './evaluation.service';
import { CandidateEvaluationStore } from './store/candidate-evaluation.store';
import { CacheModule } from '../cache/cache.module';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [CacheModule, GeminiModule],
  providers: [CandidateEvaluationService, CandidateEvaluationStore],
  exports: [CandidateEvaluationService],
})
export class EvaluationModule {}