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
import { MailCheck, MailX } from "lucide-react";

import { Card } from "@components/ui/Card";
import type { NewsletterStats } from "../types";

interface StatsPanelProps {
  stats: NewsletterStats;
}

export function StatsPanel({ stats }: StatsPanelProps) {
  const dailyData = React.useMemo(
    () =>
      Object.entries(stats.daily)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, count]) => ({ day, count, label: formatDayLabel(day) })),
    [stats.daily],
  );

  // Read the clock once on mount so the 7-day window stays stable across
  // re-renders instead of drifting on every render pass.
  const [now] = React.useState(() => Date.now());

  const newLast7Days = React.useMemo(() => {
    const cutoff = new Date(now - 7 * 86400000).toISOString().slice(0, 10);
    return Object.entries(stats.daily)
      .filter(([day]) => day >= cutoff)
      .reduce((sum, [, count]) => sum + count, 0);
  }, [stats.daily, now]);

  const bestDay = React.useMemo(
    () => dailyData.reduce((max, d) => Math.max(max, d.count), 0),
    [dailyData],
  );

  const sourceTotal = React.useMemo(
    () => stats.sources.reduce((sum, s) => sum + s.count, 0),
    [stats.sources],
  );

  const deliveryRate =
    stats.deliveries.total > 0
      ? Math.round((stats.deliveries.sent / stats.deliveries.total) * 1000) / 10
      : null;

  const hasDaily = dailyData.length > 0;
  const hasCampaigns = stats.campaigns.total > 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total subscribers" value={stats.total} />
        <StatCard label="New last 7 days" value={newLast7Days} />
        <StatCard label="Best day" value={bestDay} />
        <StatCard label="Emails delivered" value={stats.deliveries.sent} />
      </div>

      {hasDaily && (
        <Card variant="bubble" className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Signups per day (last 90 days)
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
                  formatter={(value) => [value ?? 0, "Signups"]}
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card variant="bubble" className="flex flex-col p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Subscribers by source
          </h3>
          {stats.sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No subscribers yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.sources.map((item) => {
                const percentage =
                  sourceTotal > 0
                    ? Math.round((item.count / sourceTotal) * 1000) / 10
                    : 0;
                return (
                  <div key={item.value}>
                    <div className="flex items-start justify-between gap-3 text-xs">
                      <span className="flex-1 text-foreground">
                        {item.value}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {item.count} ({percentage}%)
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card variant="bubble" className="flex flex-col p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Campaign delivery
          </h3>
          {!hasCampaigns ? (
            <p className="text-sm text-muted-foreground">
              No campaigns yet. Delivery stats appear once you send one.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {stats.campaigns.total}
                  </span>{" "}
                  campaigns
                </span>
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {stats.campaigns.sent}
                  </span>{" "}
                  sent
                </span>
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {stats.campaigns.draft}
                  </span>{" "}
                  draft
                </span>
                {stats.campaigns.sending > 0 && (
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {stats.campaigns.sending}
                    </span>{" "}
                    sending
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <DeliveryRow
                  icon={<MailCheck size={14} />}
                  label="Delivered"
                  count={stats.deliveries.sent}
                  total={stats.deliveries.total}
                />
                <DeliveryRow
                  icon={<MailX size={14} />}
                  label="Failed"
                  count={stats.deliveries.failed}
                  total={stats.deliveries.total}
                  destructive
                />
              </div>
              {deliveryRate !== null && (
                <p className="text-xs text-muted-foreground">
                  {deliveryRate}% delivery rate across{" "}
                  {stats.deliveries.total.toLocaleString()} attempted
                  deliveries.
                </p>
              )}
            </div>
          )}
        </Card>
      </div>

      {!hasDaily && !hasCampaigns && stats.total === 0 && (
        <Card variant="bubble" className="p-8 text-center">
          <p className="text-muted-foreground">
            No newsletter data yet. Statistics will appear once people subscribe
            and campaigns go out.
          </p>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card variant="bubble" className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-3xl font-semibold text-foreground">
        {value.toLocaleString()}
      </p>
    </Card>
  );
}

function DeliveryRow({
  icon,
  label,
  count,
  total,
  destructive = false,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  total: number;
  destructive?: boolean;
}) {
  const percentage = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
  return (
    <div>
      <div className="flex items-start justify-between gap-3 text-xs">
        <span
          className={`flex flex-1 items-center gap-1.5 ${
            destructive ? "text-destructive" : "text-foreground"
          }`}
        >
          {icon}
          {label}
        </span>
        <span className="shrink-0 text-muted-foreground">
          {count.toLocaleString()} ({percentage}%)
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            destructive ? "bg-destructive" : "bg-primary"
          }`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
}

function formatDayLabel(day: string): string {
  const date = new Date(`${day}T00:00:00`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
