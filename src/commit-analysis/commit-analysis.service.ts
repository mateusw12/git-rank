import { Injectable } from '@nestjs/common';
import { CommitActivitySample } from '../github/types/github-commit.type';
import {
  CommitAnalysisResult,
  CommitFrequencyBreakdown,
  CommitScheduleBreakdown,
  CommitSizeBreakdown,
} from './types/commit-analysis.type';

@Injectable()
export class CommitAnalysisService {
  private readonly analyzedWeeks = 8;

  analyze(commits: CommitActivitySample[]): CommitAnalysisResult {
    const totalCommitsAnalyzed = commits.length;

    if (totalCommitsAnalyzed === 0) {
      return {
        totalCommitsAnalyzed,
        frequency: {
          commitsPerWeek: 0,
          activeWeeks: 0,
          analyzedWeeks: this.analyzedWeeks,
          consistencyScore: 0,
        },
        schedule: {
          offHoursCommitCount: 0,
          offHoursRatio: 0,
          hourDistribution: {},
        },
        size: {
          averageTotalChanges: 0,
          averageAdditions: 0,
          averageDeletions: 0,
          largestCommitChanges: 0,
        },
        highlights: ['Nenhum commit encontrado para analise no periodo amostrado'],
      };
    }

    const frequency = this.buildFrequencyBreakdown(commits);
    const schedule = this.buildScheduleBreakdown(commits);
    const size = this.buildSizeBreakdown(commits);

    return {
      totalCommitsAnalyzed,
      frequency,
      schedule,
      size,
      highlights: this.buildHighlights(frequency, schedule, size),
    };
  }

  private buildFrequencyBreakdown(
    commits: CommitActivitySample[],
  ): CommitFrequencyBreakdown {
    const now = Date.now();
    const weekBuckets = new Array<number>(this.analyzedWeeks).fill(0);

    for (const commit of commits) {
      const authoredAt = Date.parse(commit.authoredAt);

      if (!Number.isFinite(authoredAt)) {
        continue;
      }

      const weekDiff = Math.floor((now - authoredAt) / (7 * 24 * 60 * 60 * 1000));

      if (weekDiff >= 0 && weekDiff < this.analyzedWeeks) {
        weekBuckets[weekDiff] += 1;
      }
    }

    const totalInWindow = weekBuckets.reduce((sum, value) => sum + value, 0);
    const activeWeeks = weekBuckets.filter((value) => value > 0).length;
    const commitsPerWeek = Number((totalInWindow / this.analyzedWeeks).toFixed(2));
    const consistencyScore = Math.round((activeWeeks / this.analyzedWeeks) * 100);

    return {
      commitsPerWeek,
      activeWeeks,
      analyzedWeeks: this.analyzedWeeks,
      consistencyScore,
    };
  }

  private buildScheduleBreakdown(commits: CommitActivitySample[]): CommitScheduleBreakdown {
    const hourDistribution = new Map<number, number>();
    let offHoursCommitCount = 0;

    for (const commit of commits) {
      const authoredAt = Date.parse(commit.authoredAt);

      if (!Number.isFinite(authoredAt)) {
        continue;
      }

      const hour = new Date(authoredAt).getUTCHours();
      hourDistribution.set(hour, (hourDistribution.get(hour) ?? 0) + 1);

      const isOffHours = hour < 6 || hour >= 23;

      if (isOffHours) {
        offHoursCommitCount += 1;
      }
    }

    const offHoursRatio = Number((offHoursCommitCount / commits.length).toFixed(3));
    const distribution: Record<string, number> = {};

    Array.from(hourDistribution.entries())
      .sort((a, b) => a[0] - b[0])
      .forEach(([hour, count]) => {
        distribution[hour.toString().padStart(2, '0')] = count;
      });

    return {
      offHoursCommitCount,
      offHoursRatio,
      hourDistribution: distribution,
    };
  }

  private buildSizeBreakdown(commits: CommitActivitySample[]): CommitSizeBreakdown {
    const totals = commits.map((commit) => commit.totalChanges);
    const additions = commits.map((commit) => commit.additions);
    const deletions = commits.map((commit) => commit.deletions);

    const averageTotalChanges = Number((this.average(totals)).toFixed(2));
    const averageAdditions = Number((this.average(additions)).toFixed(2));
    const averageDeletions = Number((this.average(deletions)).toFixed(2));
    const largestCommitChanges = totals.length > 0 ? Math.max(...totals) : 0;

    return {
      averageTotalChanges,
      averageAdditions,
      averageDeletions,
      largestCommitChanges,
    };
  }

  private average(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }

    const sum = values.reduce((acc, value) => acc + value, 0);
    return sum / values.length;
  }

  private buildHighlights(
    frequency: CommitFrequencyBreakdown,
    schedule: CommitScheduleBreakdown,
    size: CommitSizeBreakdown,
  ): string[] {
    const highlights: string[] = [];

    if (frequency.consistencyScore >= 70) {
      highlights.push('Boa consistencia semanal de entregas');
    } else {
      highlights.push('Consistencia de commits pode melhorar ao longo das semanas');
    }

    if (schedule.offHoursRatio >= 0.45) {
      highlights.push('Alta proporcao de commits em horario de madrugada');
    } else {
      highlights.push('Horario de commits equilibrado');
    }

    if (size.averageTotalChanges >= 150) {
      highlights.push('Commits grandes em media, avaliar granularidade de entrega');
    } else {
      highlights.push('Tamanho medio de commit saudavel para revisao');
    }

    return highlights;
  }
}