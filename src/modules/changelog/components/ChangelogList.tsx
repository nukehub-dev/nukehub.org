"use client";

import React from "react";
import { cn } from "@lib/utils";
import { ExternalLink, Sparkles, AlertTriangle, GitCommit } from "lucide-react";

export interface ChangelogEntry {
  id: string;
  version: string;
  date: Date;
  summary?: string;
  highlights: string[];
  breaking: string[];
  project?: string;
  githubReleaseUrl?: string;
  body?: string;
}

interface ChangelogListProps {
  entries: ChangelogEntry[];
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatMonthDay(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function groupByYear(entries: ChangelogEntry[]) {
  const groups: Record<string, ChangelogEntry[]> = {};
  for (const entry of entries) {
    const year = new Date(entry.date).getFullYear().toString();
    if (!groups[year]) groups[year] = [];
    groups[year].push(entry);
  }
  return Object.entries(groups).sort((a, b) => Number(b[0]) - Number(a[0]));
}

export function ChangelogList({ entries }: ChangelogListProps) {
  const grouped = React.useMemo(() => groupByYear(entries), [entries]);

  return (
    <div className="relative mx-auto max-w-3xl">
      <div className="absolute inset-y-0 left-6 w-px bg-border md:left-7" />

      <div className="space-y-12">
        {grouped.map(([year, yearEntries]) => (
          <section key={year}>
            <div className="relative mb-6 flex items-center gap-3">
              <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border bg-card shadow-sm md:h-14 md:w-14">
                <span className="text-sm font-bold tabular-nums text-card-foreground">
                  {year.slice(2)}
                </span>
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-card-foreground">
                {year}
              </h2>
            </div>

            <div className="space-y-6">
              {yearEntries.map((entry) => (
                <article key={entry.id} className="relative pl-12 md:pl-16">
                  <span className="absolute left-3 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-primary/30 bg-primary/10 md:left-3.5 md:top-1.5 md:h-7 md:w-7">
                    <GitCommit className="h-3 w-3 text-primary" />
                  </span>

                  <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/20 hover:shadow-md">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-bold text-card-foreground">
                          v{entry.version}
                        </h3>
                        {entry.project && (
                          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-primary">
                            {entry.project}
                          </span>
                        )}
                      </div>
                      <time className="shrink-0 text-sm font-medium text-muted-foreground">
                        {formatMonthDay(entry.date)}
                      </time>
                    </div>

                    {entry.summary && (
                      <p className="mt-3 text-base leading-relaxed text-foreground/90">
                        {entry.summary}
                      </p>
                    )}

                    {entry.highlights.length > 0 && (
                      <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 p-3">
                        <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          Highlights
                        </h4>
                        <ul className="space-y-2">
                          {entry.highlights.map((highlight, i) => (
                            <li
                              key={i}
                              className="flex gap-2.5 text-sm text-foreground/90"
                            >
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                              <span className="leading-relaxed">
                                {highlight}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {entry.breaking.length > 0 && (
                      <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                        <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Breaking changes
                        </h4>
                        <ul className="space-y-2">
                          {entry.breaking.map((item, i) => (
                            <li
                              key={i}
                              className="flex gap-2.5 text-sm text-amber-700 dark:text-amber-300"
                            >
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                              <span className="leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {entry.githubReleaseUrl && (
                      <a
                        href={entry.githubReleaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                      >
                        View release on GitHub
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
