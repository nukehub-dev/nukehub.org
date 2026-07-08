import * as React from "react";
import { Card } from "@components/ui/Card";
import type { SurveyStats } from "../types";

interface StatsPanelProps {
  stats: SurveyStats;
}

export function StatsPanel({ stats }: StatsPanelProps) {
  const days = React.useMemo(() => {
    const entries = Object.entries(stats.daily).sort();
    if (entries.length === 0) return [];
    return entries;
  }, [stats.daily]);

  const maxDaily = React.useMemo(() => {
    if (days.length === 0) return 1;
    return Math.max(...days.map(([, count]) => count), 1);
  }, [days]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card variant="bubble" className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total responses
          </p>
          <p className="mt-1 text-3xl font-semibold text-foreground">
            {stats.total}
          </p>
        </Card>
      </div>

      {days.length > 0 && (
        <Card variant="bubble" className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Responses per day (last 30 days)
          </h3>
          <div className="flex items-end gap-1 overflow-x-auto pb-2">
            {days.map(([day, count]) => (
              <div
                key={day}
                className="flex min-w-[2rem] flex-col items-center gap-1"
              >
                <div
                  className="w-full rounded-t bg-primary/80"
                  style={{
                    height: `${Math.max(4, (count / maxDaily) * 120)}px`,
                  }}
                  title={`${day}: ${count}`}
                />
                <span className="text-[10px] text-muted-foreground">
                  {day.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {Object.keys(stats.distributions).length > 0 && (
        <Card variant="bubble" className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Question distributions
          </h3>
          <div className="space-y-6">
            {Object.entries(stats.distributions).map(([questionId, items]) => (
              <div key={questionId}>
                <p className="mb-2 font-medium text-foreground">{questionId}</p>
                <div className="space-y-2">
                  {items.map((item) => {
                    const percentage =
                      stats.total > 0
                        ? Math.round((item.count / stats.total) * 100)
                        : 0;
                    return (
                      <div key={item.value}>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span className="line-clamp-1">{item.value}</span>
                          <span>
                            {item.count} ({percentage}%)
                          </span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
