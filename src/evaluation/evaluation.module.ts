import { Module } from '@nestjs/common';
import { CandidateEvaluationService } from './evaluation.service';
import { CandidateEvaluationStore } from './store/candidate-evaluation.store';
import { CacheModule } from '../cache/cache.module';
import { OllamaModule } from '../ollama/ollama.module';

@Module({
  imports: [CacheModule, OllamaModule],
  providers: [CandidateEvaluationService, CandidateEvaluationStore],
  exports: [CandidateEvaluationService],
})
export class EvaluationModule {}
