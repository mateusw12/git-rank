import { CommitActivitySample } from '../../github/types/github-commit.type';

export interface CommitFrequencyBreakdown {
  commitsPerWeek: number;
  activeWeeks: number;
  analyzedWeeks: number;
  consistencyScore: number;
}

export interface CommitScheduleBreakdown {
  offHoursCommitCount: number;
  offHoursRatio: number;
  hourDistribution: Record<string, number>;
}

export interface CommitSizeBreakdown {
  averageTotalChanges: number;
  averageAdditions: number;
  averageDeletions: number;
  largestCommitChanges: number;
}

export interface CommitAnalysisResult {
  totalCommitsAnalyzed: number;
  frequency: CommitFrequencyBreakdown;
  schedule: CommitScheduleBreakdown;
  size: CommitSizeBreakdown;
  highlights: string[];
}

export interface RepositoryCommitAnalysisResponse {
  owner: string;
  repository: string;
  generatedAt: string;
  analysis: CommitAnalysisResult;
  samples: {
    commitsFetched: number;
    commitsWithStats: number;
    latestCommits: CommitActivitySample[];
  };
}