export interface CandidateScoreBreakdown {
  activityScore: number;
  qualityScore: number;
  consistencyScore: number;
  finalScore: number;
}

export interface CandidateScoreMetrics {
  totalRepos: number;
  activeRepos: number;
  languageDiversity: number;
  totalStars: number;
  recentRepos30d: number;
}

export interface CandidateScoreResult {
  metrics: CandidateScoreMetrics;
  scores: CandidateScoreBreakdown;
}