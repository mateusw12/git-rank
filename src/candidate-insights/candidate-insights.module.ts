import { Module } from '@nestjs/common';
import { CandidateInsightsService } from './candidate-insights.service';

@Module({
  providers: [CandidateInsightsService],
  exports: [CandidateInsightsService],
})
export class CandidateInsightsModule {}