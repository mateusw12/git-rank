export interface GithubCommitListItem {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  author: {
    login: string;
  } | null;
}

export interface GithubCommitDetail {
  sha: string;
  stats?: {
    total: number;
    additions: number;
    deletions: number;
  };
}

export interface CommitActivitySample {
  sha: string;
  authoredAt: string;
  message: string;
  totalChanges: number;
  additions: number;
  deletions: number;
}