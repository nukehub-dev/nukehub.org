"use client";

import React from "react";
import { cn } from "@lib/utils";
import {
  CircleDot,
  Loader2,
  CheckCircle2,
  PauseCircle,
  ExternalLink,
} from "lucide-react";

export interface RoadmapItem {
  id: string;
  title: string;
  description?: string;
  status: "planned" | "in-progress" | "shipped" | "parked";
  targetQuarter?: string;
  relatedProject?: string;
  ghIssueUrl?: string;
  body?: string;
}

interface RoadmapBoardProps {
  items: RoadmapItem[];
}

const statusConfig = {
  shipped: {
    label: "Shipped",
    icon: CheckCircle2,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-900",
    accent: "bg-emerald-500",
  },
  "in-progress": {
    label: "In Progress",
    icon: Loader2,
    color: "text-primary",
    bg: "bg-primary/5 dark:bg-primary/10",
    border: "border-primary/20 dark:border-primary/20",
    accent: "bg-primary",
  },
  planned: {
    label: "Planned",
    icon: CircleDot,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-900",
    accent: "bg-blue-500",
  },
  parked: {
    label: "Parked",
    icon: PauseCircle,
    color: "text-muted-foreground",
    bg: "bg-muted/40 dark:bg-muted/30",
    border: "border-border",
    accent: "bg-muted-foreground",
  },
};

const statusOrder: RoadmapItem["status"][] = [
  "shipped",
  "in-progress",
  "planned",
  "parked",
];

export function RoadmapBoard({ items }: RoadmapBoardProps) {
  const byStatus = React.useMemo(() => {
    const map: Record<RoadmapItem["status"], RoadmapItem[]> = {
      shipped: [],
      "in-progress": [],
      planned: [],
      parked: [],
    };
    for (const item of items) {
      map[item.status].push(item);
    }
    return map;
  }, [items]);

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {statusOrder.map((status) => {
        const config = statusConfig[status];
        const column = byStatus[status];
        const Icon = config.icon;

        return (
          <section
            key={status}
            className={cn(
              "flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm",
              config.border,
            )}
          >
            <div
              className={cn(
                "flex items-center gap-2.5 border-b px-4 py-3",
                config.border,
                config.bg,
              )}
            >
              <Icon className={cn("h-5 w-5", config.color)} />
              <h2 className="flex-1 text-sm font-semibold uppercase tracking-wider text-card-foreground">
                {config.label}
              </h2>
              <span className="rounded-full bg-background border px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                {column.length}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-3">
              {column.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No items yet.
                </p>
              )}
              {column.map((item) => (
                <article
                  key={item.id}
                  className={cn(
                    "group relative flex flex-col gap-2 rounded-xl border bg-background p-4 transition-all",
                    "hover:shadow-md hover:-translate-y-0.5",
                    config.border,
                  )}
                >
                  <div
                    className={cn(
                      "absolute left-0 top-4 h-8 w-1 rounded-r-full transition-all group-hover:h-10 group-hover:top-3",
                      config.accent,
                    )}
                  />

                  <h3 className="pl-3 font-semibold leading-tight text-card-foreground">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="pl-3 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  )}

                  <div className="pl-3 mt-1 flex flex-wrap items-center gap-2">
                    {item.targetQuarter && (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {item.targetQuarter}
                      </span>
                    )}
                    {item.relatedProject && (
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                        {item.relatedProject}
                      </span>
                    )}
                  </div>

                  {item.ghIssueUrl && (
                    <a
                      href={item.ghIssueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pl-3 mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      GitHub issue
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
