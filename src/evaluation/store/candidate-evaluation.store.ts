import { Injectable } from '@nestjs/common';
import { StoredCandidateAiEvaluation } from '../types/candidate-ai-evaluation.type';

@Injectable()
export class CandidateEvaluationStore {
  private readonly evaluationsByUsername = new Map<
    string,
    StoredCandidateAiEvaluation
  >();

  set(item: StoredCandidateAiEvaluation): void {
    this.evaluationsByUsername.set(item.username.toLowerCase(), item);
  }

  get(username: string): StoredCandidateAiEvaluation | null {
    return this.evaluationsByUsername.get(username.toLowerCase()) ?? null;
  }
}