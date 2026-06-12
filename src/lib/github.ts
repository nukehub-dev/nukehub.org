import githubStats from "@data/github-stats.json";

export interface GitHubRepoStats {
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  contributors: number;
  lastCommitAt: string | null;
  lastRelease: {
    tag: string;
    name: string;
    publishedAt: string;
    url: string;
  } | null;
  defaultBranch: string;
}

export interface GitHubStats {
  lastUpdated: string;
  maxStaleHours: number;
  repos: Record<string, GitHubRepoStats>;
  aggregate: {
    totalRepos: number;
    syncedRepos: number;
    failedRepos: number;
    totalStars: number;
    totalForks: number;
    totalContributors: number;
    totalOpenIssues: number;
  };
}

const typedStats = githubStats as unknown as GitHubStats;

/**
 * Get live GitHub stats for a repository declared in project frontmatter.
 *
 * @param githubRepo - "owner/name" identifier (e.g. "nukehub-dev/nukelab")
 * @returns Repo stats or null if not synced
 */
export function getRepoStats(githubRepo?: string): GitHubRepoStats | null {
  if (!githubRepo) return null;
  return typedStats.repos[githubRepo] ?? null;
}

/**
 * Aggregate stats across all synced NukeHub repositories.
 */
export function getAggregateStats(): GitHubStats["aggregate"] {
  return typedStats.aggregate;
}

/**
 * ISO timestamp of the last successful sync run.
 */
export function getLastSyncedAt(): string {
  return typedStats.lastUpdated;
}

/**
 * Format a number for compact display (e.g. 1,250 → "1.2k").
 */
export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(value);
}

/**
 * Format a GitHub ISO date as a human-readable relative string.
 */
export function formatRelativeTime(dateString?: string | null): string | null {
  if (!dateString) return null;

  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}
