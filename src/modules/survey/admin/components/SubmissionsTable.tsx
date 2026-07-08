import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Eye,
  LayoutGrid,
  List,
  Check,
  GripVertical,
  Mail,
  Calendar,
  Hash,
  ArrowUpRight,
} from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type Row,
} from "@tanstack/react-table";
import { Button } from "@components/ui/Button";
import { cn } from "@lib/utils";
import type { Submission } from "../types";
import type { QuestionMeta } from "../lib/survey-metadata";

interface SubmissionsTableProps {
  submissions: Submission[];
  page: number;
  limit: number;
  total: number;
  questionMap: Map<string, QuestionMeta>;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

const LIMIT_OPTIONS = [10, 20, 50, 100];

export function SubmissionsTable({
  submissions,
  page,
  limit,
  total,
  questionMap,
  isLoading,
  onPageChange,
  onLimitChange,
}: SubmissionsTableProps) {
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "submittedAt", desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] = React.useState<
    Record<string, boolean>
  >({});
  const [showColumnMenu, setShowColumnMenu] = React.useState(false);
  const [showMobile, setShowMobile] = React.useState(false);
  const [showLimitDropdown, setShowLimitDropdown] = React.useState(false);
  const [selectedSubmission, setSelectedSubmission] =
    React.useState<Submission | null>(null);
  const columnMenuRef = React.useRef<HTMLDivElement>(null);
  const limitRef = React.useRef<HTMLDivElement>(null);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        columnMenuRef.current &&
        !columnMenuRef.current.contains(event.target as Node)
      ) {
        setShowColumnMenu(false);
      }
      if (
        limitRef.current &&
        !limitRef.current.contains(event.target as Node)
      ) {
        setShowLimitDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close modal on Escape.
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedSubmission(null);
      }
    }
    if (selectedSubmission) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [selectedSubmission]);

  const columns = React.useMemo<ColumnDef<Submission>[]>(() => {
    const base: ColumnDef<Submission>[] = [
      {
        id: "__meta_id",
        accessorFn: (row) => row.id,
        header: "ID",
        cell: (info) => (
          <span className="font-mono text-muted-foreground">
            #{info.getValue<number>()}
          </span>
        ),
        size: 64,
      },
      {
        id: "__meta_submittedAt",
        accessorFn: (row) => row.submittedAt,
        header: "Submitted",
        cell: (info) => (
          <span className="whitespace-nowrap">
            {new Date(info.getValue<string>()).toLocaleString()}
          </span>
        ),
        size: 180,
      },
      {
        id: "__meta_email",
        accessorFn: (row) => row.email,
        header: "Email",
        cell: (info) => {
          const value = info.getValue<string>();
          return value ? (
            <a
              href={`mailto:${value}`}
              className="text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {value}
            </a>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
        size: 220,
      },
    ];

    const questionIds =
      questionMap.size > 0
        ? Array.from(questionMap.keys())
        : Array.from(
            new Set(submissions.flatMap((s) => Object.keys(s.responses))),
          ).sort();

    const questionColumns: ColumnDef<Submission>[] = questionIds.map((id) => ({
      id,
      accessorFn: (row) => row.responses[id] || "",
      header: questionMap.get(id)?.label || id,
      cell: (info) => <ResponseCell value={info.getValue<string>()} />,
      size: 240,
    }));

    return [...base, ...questionColumns];
  }, [questionMap, submissions]);

  const table = useReactTable({
    data: submissions,
    columns,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  const visibleCount = table.getRowModel().rows.length;

  const handleRowClick = (row: Row<Submission>) => {
    setSelectedSubmission(row.original);
  };

  if (isLoading) {
    return <SubmissionsSkeleton columns={columns.length} rows={limit} />;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search responses..."
            className="h-9 w-full rounded-lg border border-input bg-input/80 pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
          {globalFilter && (
            <button
              type="button"
              onClick={() => setGlobalFilter("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 hover:bg-accent"
            >
              <X size={14} className="text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Column visibility */}
          {!showMobile && (
            <div className="relative" ref={columnMenuRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowColumnMenu((v) => !v)}
                className={cn(
                  showColumnMenu &&
                    "border-primary/30 bg-primary/10 text-primary",
                )}
              >
                <Eye size={16} />
                Columns
              </Button>

              <AnimatePresence>
                {showColumnMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-border bg-popover p-2 shadow-lg"
                  >
                    <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Toggle columns
                    </div>
                    <div className="max-h-72 space-y-0.5 overflow-y-auto">
                      {table
                        .getAllLeafColumns()
                        .filter((column) => {
                          const header = column.columnDef.header;
                          return typeof header === "string" && header !== "";
                        })
                        .map((column) => (
                          <button
                            key={column.id}
                            type="button"
                            role="checkbox"
                            aria-checked={column.getIsVisible()}
                            onClick={() => column.toggleVisibility()}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                              column.getIsVisible()
                                ? "text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            <Check
                              size={14}
                              className={cn(
                                "shrink-0",
                                column.getIsVisible()
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            <span className="min-w-0 flex-1 truncate">
                              {column.columnDef.header as string}
                            </span>
                          </button>
                        ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* View toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMobile((v) => !v)}
            className={cn(
              showMobile && "border-primary/30 bg-primary/10 text-primary",
            )}
          >
            {showMobile ? (
              <>
                <List size={16} />
                Table
              </>
            ) : (
              <>
                <LayoutGrid size={16} />
                Cards
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Table view */}
      <div className={cn(showMobile && "hidden")}>
        <div className="relative overflow-x-auto rounded-xl border border-border/50 bg-card">
          <table className="w-full caption-bottom text-sm">
            <thead className="sticky top-0 z-10 bg-muted/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-border/50 transition-colors"
                >
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={cn(
                        "h-10 px-2 text-left align-middle font-medium text-muted-foreground sm:px-4",
                        header.column.getCanSort() &&
                          "cursor-pointer select-none hover:text-foreground",
                      )}
                      style={{ width: header.getSize() }}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                        {header.column.getCanSort() && (
                          <SortIcon sorted={header.column.getIsSorted()} />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border/50">
              <AnimatePresence mode="popLayout">
                {table.getRowModel().rows.map((row, i) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: i * 0.03, duration: 0.3 }}
                    className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/30"
                    onClick={() => handleRowClick(row)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-2 py-3 align-top whitespace-nowrap sm:px-4 sm:py-4"
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {visibleCount === 0 && (
            <div className="px-4 py-12 text-center text-muted-foreground">
              No responses match your search.
            </div>
          )}
        </div>
      </div>

      {/* Mobile card view */}
      <div className={cn(!showMobile && "hidden")}>
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {table.getRowModel().rows.map((row, i) => (
              <SubmissionCard
                key={row.id}
                submission={row.original}
                questionMap={questionMap}
                index={i}
                onView={() => handleRowClick(row)}
              />
            ))}
          </AnimatePresence>
          {visibleCount === 0 && (
            <div className="rounded-xl border border-border/50 bg-card px-4 py-12 text-center text-muted-foreground">
              No responses match your search.
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-col items-center justify-between gap-4 py-2 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">
              {total === 0 ? 0 : (page - 1) * limit + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-foreground">
              {Math.min(page * limit, total)}
            </span>{" "}
            of <span className="font-medium text-foreground">{total}</span>{" "}
            responses
          </p>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <PaginationButton
                onClick={() => onPageChange(1)}
                disabled={page <= 1}
                aria-label="First page"
              >
                <ChevronsLeft size={16} />
              </PaginationButton>
              <PaginationButton
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </PaginationButton>

              <div className="flex items-center gap-1 px-1">
                {getVisiblePages(page, totalPages).map((pageNum, idx) =>
                  pageNum === null ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="px-1 text-muted-foreground"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => onPageChange(pageNum)}
                      className={cn(
                        "h-8 min-w-[2rem] rounded-lg px-2 text-sm font-medium transition-colors",
                        page === pageNum
                          ? "bg-primary text-primary-foreground"
                          : "border border-input/50 bg-input/80 hover:bg-accent",
                      )}
                    >
                      {pageNum}
                    </button>
                  ),
                )}
              </div>

              <PaginationButton
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </PaginationButton>
              <PaginationButton
                onClick={() => onPageChange(totalPages)}
                disabled={page >= totalPages}
                aria-label="Last page"
              >
                <ChevronsRight size={16} />
              </PaginationButton>
            </div>

            <div ref={limitRef} className="relative">
              <button
                type="button"
                onClick={() => setShowLimitDropdown((v) => !v)}
                className={cn(
                  "relative flex h-8 items-center gap-2 rounded-lg border border-input/50 bg-input/80 px-3 pr-8 text-sm font-medium transition-colors hover:bg-accent",
                  showLimitDropdown &&
                    "border-primary/30 bg-primary/10 text-primary",
                )}
              >
                <span>{limit} / page</span>
                <ChevronDown
                  size={14}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
              </button>

              <AnimatePresence>
                {showLimitDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    className="absolute right-0 bottom-full z-50 mb-1 min-w-[120px] rounded-xl border border-border bg-popover p-1.5 shadow-lg"
                  >
                    {LIMIT_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          onLimitChange(opt);
                          setShowLimitDropdown(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                          limit === opt
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-accent",
                        )}
                      >
                        <Check
                          size={16}
                          className={cn(
                            limit === opt ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span>{opt} / page</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      <SubmissionModal
        submission={selectedSubmission}
        questionMap={questionMap}
        onClose={() => setSelectedSubmission(null)}
      />
    </div>
  );
}

function SubmissionCard({
  submission,
  questionMap,
  index,
  onView,
}: {
  submission: Submission;
  questionMap: Map<string, QuestionMeta>;
  index: number;
  onView: () => void;
}) {
  const questionIds = Array.from(questionMap.keys());
  const previewIds = questionIds.slice(0, 3);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        delay: index * 0.05,
        type: "spring",
        stiffness: 300,
        damping: 30,
      }}
      className="rounded-xl border border-border/50 bg-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Hash size={12} />
            <span className="font-mono">#{submission.id}</span>
            <span>·</span>
            <Calendar size={12} />
            <span>{new Date(submission.submittedAt).toLocaleString()}</span>
          </div>
          {submission.email && (
            <a
              href={`mailto:${submission.email}`}
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail size={14} />
              <span className="truncate">{submission.email}</span>
            </a>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onView}>
          View
          <ArrowUpRight size={14} className="ml-1" />
        </Button>
      </div>

      {previewIds.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
          {previewIds.map((id) => {
            const label = questionMap.get(id)?.label || id;
            const value = submission.responses[id];
            return (
              <div key={id} className="flex gap-2 text-sm">
                <span className="shrink-0 text-muted-foreground">{label}:</span>
                <span className="line-clamp-2 flex-1 font-medium text-foreground">
                  {value ? (
                    <ResponseCell value={value} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function SubmissionModal({
  submission,
  questionMap,
  onClose,
}: {
  submission: Submission | null;
  questionMap: Map<string, QuestionMeta>;
  onClose: () => void;
}) {
  if (!submission) return null;

  const questionIds =
    questionMap.size > 0
      ? Array.from(questionMap.keys())
      : Object.keys(submission.responses).sort();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border/50 bg-muted/30 px-6 py-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">
                Response #{submission.id}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(submission.submittedAt).toLocaleString()}
                </span>
                {submission.email && (
                  <a
                    href={`mailto:${submission.email}`}
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Mail size={14} />
                    {submission.email}
                  </a>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[calc(85vh-8rem)] divide-y divide-border/40 overflow-y-auto p-6">
            {questionIds.map((id) => {
              const meta = questionMap.get(id);
              const label = meta?.label || id;
              const value = submission.responses[id];

              return (
                <div key={id} className="py-4 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <div className="mt-1.5 text-sm text-foreground/90">
                    {value ? (
                      <DetailValue value={value} type={meta?.type} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-border/50 bg-muted/30 px-6 py-3">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function DetailValue({
  value,
  type,
}: {
  value: string;
  type?: QuestionMeta["type"];
}) {
  if (type === "rating") {
    const num = parseInt(value, 10);
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "text-lg",
              i < num ? "text-primary" : "text-muted-foreground/30",
            )}
          >
            ★
          </span>
        ))}
        <span className="ml-1 text-muted-foreground">({value})</span>
      </div>
    );
  }

  const lines = value.split("\n").filter(Boolean);
  if (lines.length > 1) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {lines.map((line, i) => (
          <span
            key={i}
            className="inline-flex items-center rounded-md bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
          >
            {line}
          </span>
        ))}
      </div>
    );
  }

  return <p className="whitespace-pre-wrap leading-relaxed">{value}</p>;
}

function PaginationButton({
  children,
  onClick,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg border border-input/50 bg-input/80 transition-colors hover:bg-accent",
        disabled && "pointer-events-none opacity-50",
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function getVisiblePages(current: number, total: number): Array<number | null> {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, 4, null, total];
  }
  if (current >= total - 2) {
    return [1, null, total - 3, total - 2, total - 1, total];
  }
  return [1, null, current - 1, current, current + 1, null, total];
}

function ResponseCell({ value }: { value: string }) {
  if (!value) return <span className="text-muted-foreground">—</span>;

  const lines = value.split("\n").filter(Boolean);
  if (lines.length <= 1) {
    return (
      <div className="max-w-xs line-clamp-3 whitespace-pre-wrap">{value}</div>
    );
  }

  return (
    <div className="flex max-w-xs flex-wrap gap-1">
      {lines.map((line, i) => (
        <span
          key={i}
          className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
        >
          {line}
        </span>
      ))}
    </div>
  );
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (!sorted) {
    return <GripVertical size={14} className="text-muted-foreground/40" />;
  }
  if (sorted === "asc") {
    return <ChevronUp size={14} className="text-primary" />;
  }
  return <ChevronDown size={14} className="text-primary" />;
}

function SubmissionsSkeleton({
  columns,
  rows,
}: {
  columns: number;
  rows: number;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-9 w-full rounded-lg bg-muted sm:w-72" />
        <div className="flex gap-2">
          <div className="h-9 w-28 rounded-lg bg-muted" />
          <div className="h-9 w-24 rounded-lg bg-muted" />
        </div>
      </div>
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <div className="flex gap-4">
          {Array.from({ length: Math.min(columns, 6) }).map((_, i) => (
            <div key={i} className="h-4 flex-1 rounded bg-muted" />
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <motion.div
              key={rowIndex}
              className="flex gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: rowIndex * 0.03, duration: 0.3 }}
            >
              {Array.from({ length: Math.min(columns, 6) }).map(
                (_, colIndex) => (
                  <div
                    key={colIndex}
                    className="h-10 flex-1 rounded-lg bg-muted"
                    style={{ opacity: 0.4 + (rowIndex % 2) * 0.15 }}
                  />
                ),
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
