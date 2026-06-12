import { Star, GitFork, Users } from "lucide-react";
import {
  getRepoStats,
  formatCompactNumber,
  formatRelativeTime,
} from "@lib/github";
import { cn } from "@lib/utils";

interface GitHubStatsOverlayProps {
  githubRepo?: string;
  className?: string;
  showUpdated?: boolean;
}

export function GitHubStatsOverlay({
  githubRepo,
  className,
  showUpdated = true,
}: GitHubStatsOverlayProps) {
  const stats = githubRepo ? getRepoStats(githubRepo) : null;
  if (!stats) return null;

  const hasAnyStat =
    stats.stars > 0 || stats.forks > 0 || stats.contributors > 0;
  if (!hasAnyStat && !stats.lastCommitAt) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-0 left-0 right-0 z-10 flex items-end justify-between gap-2 p-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {stats.stars > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[10px] font-medium text-white/90 backdrop-blur-sm">
            <Star className="h-3 w-3" />
            {formatCompactNumber(stats.stars)}
          </span>
        )}
        {stats.forks > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[10px] font-medium text-white/90 backdrop-blur-sm">
            <GitFork className="h-3 w-3" />
            {formatCompactNumber(stats.forks)}
          </span>
        )}
        {stats.contributors > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[10px] font-medium text-white/90 backdrop-blur-sm">
            <Users className="h-3 w-3" />
            {formatCompactNumber(stats.contributors)}
          </span>
        )}
      </div>

      {showUpdated && stats.lastCommitAt && (
        <span className="rounded-full bg-black/50 px-2 py-1 text-[10px] font-medium text-white/90 backdrop-blur-sm">
          {formatRelativeTime(stats.lastCommitAt)}
        </span>
      )}
    </div>
  );
}
