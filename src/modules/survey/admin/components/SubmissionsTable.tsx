import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@components/ui/Button";
import { Card } from "@components/ui/Card";
import type { Submission } from "../types";

interface SubmissionsTableProps {
  submissions: Submission[];
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function SubmissionsTable({
  submissions,
  page,
  limit,
  total,
  onPageChange,
}: SubmissionsTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  // Collect all unique question IDs across the current page
  const questionIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const s of submissions) {
      for (const id of Object.keys(s.responses)) {
        ids.add(id);
      }
    }
    return Array.from(ids).sort();
  }, [submissions]);

  return (
    <Card variant="bubble" className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              <th className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                ID
              </th>
              <th className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                Submitted
              </th>
              {questionIds.map((id) => (
                <th
                  key={id}
                  className="whitespace-nowrap px-4 py-3 font-medium text-foreground"
                >
                  {id}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission) => (
              <tr
                key={submission.id}
                className="border-b border-border last:border-b-0"
              >
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  #{submission.id}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {new Date(submission.submittedAt).toLocaleString()}
                </td>
                {questionIds.map((id) => (
                  <td key={id} className="max-w-xs px-4 py-3 text-foreground">
                    <div className="line-clamp-3 whitespace-pre-wrap">
                      {submission.responses[id] || "—"}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {total === 0 ? "No results" : `${start}–${end} of ${total}`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
