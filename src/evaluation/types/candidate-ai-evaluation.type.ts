import { CandidateScoreResult } from '../../scoring/types/candidate-score.type';

export type CandidateLevel = 'Junior' | 'Pleno' | 'Senior';

export interface CandidateAiEvaluation {
  score: number;
  level: CandidateLevel;
  strengths: string[];
  weaknesses: string[];
  evaluatedAt: string;
  model: string;
}

export interface CandidateEvaluationInput {
  username: string;
  repositories: Array<{
    name: string;
    fullName: string;
    language: string | null;
    stars: number;
    forks: number;
    openIssues: number;
    isFork: boolean;
    pushedAt: string;
    createdAt: string;
    updatedAt: string;
  }>;
  scoring: CandidateScoreResult;
}

export interface StoredCandidateAiEvaluation {
  username: string;
  cacheUntil: string;
  value: CandidateAiEvaluation;
}