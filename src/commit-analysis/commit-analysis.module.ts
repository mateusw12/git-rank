import { Module } from '@nestjs/common';
import { CommitAnalysisService } from './commit-analysis.service';

@Module({
  providers: [CommitAnalysisService],
  exports: [CommitAnalysisService],
})
export class CommitAnalysisModule {}
