import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@components/ui/Card";
import type { Distribution, SurveyStats } from "../types";
import type { QuestionMeta } from "../lib/survey-metadata";

interface StatsPanelProps {
  stats: SurveyStats;
  questionMap: Map<string, QuestionMeta>;
}

interface DailyPoint {
  day: string;
  count: number;
  label: string;
}

const FREE_TEXT_TYPES = new Set<QuestionMeta["type"]>([
  "text",
  "textarea",
  "email",
  "url",
]);
export function StatsPanel({ stats, questionMap }: StatsPanelProps) {
  const dailyData: DailyPoint[] = React.useMemo(() => {
    return Object.entries(stats.daily)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, count]) => ({
        day,
        count,
        label: formatDayLabel(day),
      }));
  }, [stats.daily]);

  const distributions = React.useMemo(() => {
    const result: {
      questionId: string;
      label: string;
      items: (Distribution & { percentage: number })[];
    }[] = [];

    for (const [questionId, rawItems] of Object.entries(stats.distributions)) {
      const type = questionMap.get(questionId)?.type;
      if (!type || FREE_TEXT_TYPES.has(type)) continue;

      const items =
        type === "checkbox"
          ? aggregateCheckboxItems(rawItems)
          : rawItems.slice().sort((a, b) => b.count - a.count);

      const withPercentage = items
        .filter((item) => item.value.trim() !== "")
        .map((item) => ({
          ...item,
          percentage:
            stats.total > 0
              ? Math.round((item.count / stats.total) * 1000) / 10
              : 0,
        }));

      if (withPercentage.length === 0) continue;

      result.push({
        questionId,
        label: questionMap.get(questionId)?.label || questionId,
        items: withPercentage,
      });
    }

    return result.sort((a, b) => a.label.localeCompare(b.label));
  }, [stats.distributions, stats.total, questionMap]);

  const maxDaily = React.useMemo(() => {
    if (dailyData.length === 0) return 1;
    return Math.max(...dailyData.map((d) => d.count), 1);
  }, [dailyData]);

  const hasDaily = dailyData.length > 0;
  const hasDistributions = distributions.length > 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card variant="bubble" className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total responses
          </p>
          <p className="mt-1 text-3xl font-semibold text-foreground">
            {stats.total.toLocaleString()}
          </p>
        </Card>
        <Card variant="bubble" className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Days with responses
          </p>
          <p className="mt-1 text-3xl font-semibold text-foreground">
            {dailyData.length}
          </p>
        </Card>
        <Card variant="bubble" className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Best day
          </p>
          <p className="mt-1 text-3xl font-semibold text-foreground">
            {maxDaily}
          </p>
        </Card>
        <Card variant="bubble" className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Question breakdowns
          </p>
          <p className="mt-1 text-3xl font-semibold text-foreground">
            {distributions.length}
          </p>
        </Card>
      </div>

      {hasDaily && (
        <Card variant="bubble" className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Responses per day
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyData}
                margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--card-foreground)",
                  }}
                  formatter={(value) => [value ?? 0, "Responses"]}
                  labelFormatter={(label) => `${label}`}
                />
                <Bar
                  dataKey="count"
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {hasDistributions && (
        <div className="grid gap-4 md:grid-cols-2">
          {distributions.map(({ questionId, label, items }) => (
            <Card
              key={questionId}
              variant="bubble"
              className="flex flex-col p-5"
            >
              <h3 className="mb-4 text-sm font-semibold text-foreground">
                {label}
              </h3>
              <div
                className="max-h-[24rem] space-y-3 overflow-y-auto pr-3"
                style={{ scrollbarGutter: "stable" }}
              >
                {items.map((item) => (
                  <div key={item.value}>
                    <div className="flex items-start justify-between gap-3 text-xs">
                      <span className="line-clamp-2 flex-1 text-foreground">
                        {formatOptionLabel(item.value)}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{
                          width: `${Math.min(100, item.percentage)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {!hasDaily && !hasDistributions && (
        <Card variant="bubble" className="p-8 text-center">
          <p className="text-muted-foreground">
            No response data yet. Responses will appear here once submissions
            start coming in.
          </p>
        </Card>
      )}
    </div>
  );
}

function formatDayLabel(day: string): string {
  const date = new Date(`${day}T00:00:00`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatOptionLabel(value: string): string {
  return value.replace(/\n/g, ", ");
}

function aggregateCheckboxItems(items: Distribution[]): Distribution[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const parts = item.value
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);
    if (parts.length === 0) continue;
    for (const part of parts) {
      counts.set(part, (counts.get(part) ?? 0) + item.count);
    }
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}
