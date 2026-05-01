export interface CandidateTechnologyAnalysis {
  profile: string;
  stack: string[];
  dominantLanguages: Array<{
    language: string;
    repositories: number;
  }>;
  domains: {
    backend: number;
    frontend: number;
    data: number;
  };
}

export interface CandidateEvolutionAnalysis {
  isImproving: boolean;
  trend: 'improving' | 'stable' | 'declining';
  oldProjectsAverageScore: number;
  recentProjectsAverageScore: number;
  deltaScore: number;
  summary: string;
}

export interface CandidateInsights {
  technology: CandidateTechnologyAnalysis;
  evolution: CandidateEvolutionAnalysis;
}