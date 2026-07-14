import * as React from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  Inbox,
  Mail,
  Minus,
  SearchX,
  Trash2,
  Users,
} from "lucide-react";

import { useMaybeAuth } from "@lib/auth/NukeAuthProvider";
import { cn } from "@lib/utils";
import { Button } from "@components/ui/Button";
import { Card } from "@components/ui/Card";
import { Badge } from "@components/ui/Badge";
import { ConfirmDialog } from "@components/ui/Dialog";
import { SearchInput } from "@components/ui/SearchInput";
import { Select } from "@components/ui/Select";
import { CampaignManager } from "./CampaignManager";
import { useSubscribers } from "../hooks/useNewsletterAdmin";
import {
  bulkDeleteSubscribers,
  deleteSubscriber,
  fetchExportCsv,
} from "../lib/admin-api";
import type { Subscriber } from "../types";

const ADMIN_ROLE = "newsletter-admin";
const STAFF_ROLE = "newsletter-staff";
const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

function useCanAccessNewsletterAdmin() {
  const auth = useMaybeAuth();
  const isAdmin = auth?.hasRole(ADMIN_ROLE) ?? false;
  const isStaff = auth?.hasRole(STAFF_ROLE) ?? false;
  return { auth, isAdmin, isStaff, canAccess: isAdmin || isStaff };
}

export function NewsletterAdminDashboard() {
  const { auth, isAdmin, isStaff, canAccess } = useCanAccessNewsletterAdmin();
  const token = auth?.token ?? null;
  const [tab, setTab] = React.useState<"subscribers" | "campaigns">(
    "subscribers",
  );
  const [page, setPage] = React.useState(1);

  // Search is debounced so each keystroke does not fire a request.
  const [searchInput, setSearchInput] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [sourceFilter, setSourceFilter] = React.useState("");
  const [selected, setSelected] = React.useState<ReadonlySet<number>>(
    new Set(),
  );

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(searchInput.trim());
      setPage(1);
      setSelected(new Set());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const { data, error, isLoading, refresh } = useSubscribers(
    token,
    page,
    PAGE_SIZE,
    query,
    sourceFilter,
  );

  const [exporting, setExporting] = React.useState(false);
  const [exportError, setExportError] = React.useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<Subscriber | null>(
    null,
  );
  const [pendingBulkDelete, setPendingBulkDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const subscribers = React.useMemo(
    () => data?.subscribers ?? [],
    [data?.subscribers],
  );
  const sources = React.useMemo(() => data?.sources ?? [], [data?.sources]);
  const latestSignup = subscribers[0]?.subscribedAt ?? null;
  const sourceCount = React.useMemo(
    () => new Set(subscribers.map((s) => s.source)).size,
    [subscribers],
  );
  const filtersActive = query !== "" || sourceFilter !== "";

  const canManage = isAdmin || isStaff;
  const pageIds = subscribers.map((s) => s.id);
  const selectedOnPage = pageIds.filter((id) => selected.has(id)).length;
  const allOnPageSelected =
    pageIds.length > 0 && selectedOnPage === pageIds.length;
  const someOnPageSelected = selectedOnPage > 0 && !allOnPageSelected;

  const changePage = (next: number) => {
    setPage(next);
    setSelected(new Set());
  };

  const changeSourceFilter = (value: string) => {
    setSourceFilter(value);
    setPage(1);
    setSelected(new Set());
  };

  const clearFilters = () => {
    setSearchInput("");
    changeSourceFilter("");
  };

  const toggleSelectAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (!auth || auth.isLoading) {
    return <DashboardSkeleton />;
  }

  if (!auth.isAuthenticated) {
    return (
      <Card variant="bubble" className="p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-7 w-7 text-primary" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Admin sign-in required
        </h2>
        <p className="mt-2 text-muted-foreground">
          Sign in to view and manage newsletter subscribers.
        </p>
        <Button onClick={auth.login} className="mt-6">
          Sign in
        </Button>
      </Card>
    );
  }

  if (!canAccess) {
    return (
      <Card variant="bubble" className="p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <Mail className="h-7 w-7 text-destructive" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Access denied
        </h2>
        <p className="mt-2 text-muted-foreground">
          Your account does not have the newsletter admin or staff role.
        </p>
      </Card>
    );
  }

  const handleExport = async () => {
    if (!token) return;
    setExporting(true);
    setExportError(null);
    try {
      const blob = await fetchExportCsv(token);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "newsletter-subscribers.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteSubscriber(token, pendingDelete.id);
      setPendingDelete(null);
      refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!token || selected.size === 0) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await bulkDeleteSubscribers(token, Array.from(selected));
      setSelected(new Set());
      setPendingBulkDelete(false);
      refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-foreground">Newsletter</h1>
        <div className="flex items-center gap-3">
          {isStaff && !isAdmin && (
            <Badge variant="outline" className="gap-1">
              <Eye size={14} />
              Staff
            </Badge>
          )}
          {tab === "subscribers" && (
            <Button
              variant="outline"
              onClick={handleExport}
              loading={exporting}
              disabled={total === 0}
            >
              <Download size={16} />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b border-border/50">
        {(["subscribers", "campaigns"] as const).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium capitalize transition-colors ${
              tab === name
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {tab === "campaigns" ? (
        <CampaignManager
          token={token}
          isAdmin={isAdmin}
          subscriberCount={total}
        />
      ) : (
        <>
          {exportError && (
            <Card variant="bubble" className="p-4 text-sm text-destructive">
              {exportError}
            </Card>
          )}
          {deleteError && (
            <Card variant="bubble" className="p-4 text-sm text-destructive">
              {deleteError}
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard
              icon={<Users size={20} />}
              label={
                filtersActive ? "Matching subscribers" : "Total subscribers"
              }
              value={total.toLocaleString()}
            />
            <SummaryCard
              icon={<Clock size={20} />}
              label="Latest signup"
              value={
                latestSignup ? new Date(latestSignup).toLocaleDateString() : "—"
              }
              subvalue={
                latestSignup
                  ? new Date(latestSignup).toLocaleTimeString()
                  : undefined
              }
            />
            <SummaryCard
              icon={<Mail size={20} />}
              label="Sources (this page)"
              value={sourceCount}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SearchInput
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onClear={() => setSearchInput("")}
              placeholder="Search by email…"
              className="min-w-[220px] flex-1"
            />
            <Select
              value={sourceFilter}
              onChange={changeSourceFilter}
              options={[
                { value: "", label: "All sources" },
                ...sources.map((s) => ({ value: s, label: s })),
              ]}
              className="w-44"
            />
          </div>

          {selected.size > 0 && (
            <Card
              variant="bubble"
              className="flex flex-wrap items-center gap-3 p-3"
            >
              <span className="pl-2 text-sm font-medium text-foreground">
                {selected.size} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setPendingBulkDelete(true)}
              >
                <Trash2 size={14} />
                Delete selected
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelected(new Set())}
              >
                Clear selection
              </Button>
            </Card>
          )}

          {isLoading && !data ? (
            <Card variant="bubble" className="h-72 animate-pulse p-5">
              <div className="h-4 w-full rounded bg-muted" />
              <div className="mt-4 h-4 w-full rounded bg-muted" />
              <div className="mt-4 h-4 w-2/3 rounded bg-muted" />
            </Card>
          ) : error ? (
            <Card variant="bubble" className="p-8 text-center text-destructive">
              <p>{error}</p>
            </Card>
          ) : subscribers.length === 0 ? (
            <Card variant="bubble" className="p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                {filtersActive ? (
                  <SearchX className="h-7 w-7 text-primary" />
                ) : (
                  <Inbox className="h-7 w-7 text-primary" />
                )}
              </div>
              <h2 className="mt-4 text-lg font-semibold text-foreground">
                {filtersActive ? "No matches" : "No subscribers yet"}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {filtersActive
                  ? "No subscribers match the current search or filter."
                  : "Subscribers will appear here once people sign up."}
              </p>
              {filtersActive && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="mt-6"
                >
                  Clear search and filters
                </Button>
              )}
            </Card>
          ) : (
            <Card variant="bubble" className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      {canManage && (
                        <th className="w-12 px-5 py-3">
                          <RowCheckbox
                            checked={allOnPageSelected}
                            indeterminate={someOnPageSelected}
                            onChange={toggleSelectAllOnPage}
                            label="Select all on this page"
                          />
                        </th>
                      )}
                      <th className="px-5 py-3 font-semibold">Email</th>
                      <th className="px-5 py-3 font-semibold">Subscribed</th>
                      <th className="px-5 py-3 font-semibold">Source</th>
                      {canManage && (
                        <th className="px-5 py-3 text-right font-semibold">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((subscriber) => {
                      const isSelected = selected.has(subscriber.id);
                      return (
                        <tr
                          key={subscriber.id}
                          onClick={
                            canManage
                              ? () => toggleSelect(subscriber.id)
                              : undefined
                          }
                          className={cn(
                            "border-b border-border/30 last:border-0 hover:bg-accent/40",
                            canManage && "cursor-pointer",
                            isSelected && "bg-primary/5 hover:bg-primary/10",
                          )}
                        >
                          {canManage && (
                            <td className="px-5 py-3">
                              <RowCheckbox
                                checked={isSelected}
                                onChange={() => toggleSelect(subscriber.id)}
                                label={`Select ${subscriber.email}`}
                              />
                            </td>
                          )}
                          <td className="px-5 py-3 text-foreground">
                            {subscriber.email}
                          </td>
                          <td className="px-5 py-3 text-muted-foreground">
                            {new Date(subscriber.subscribedAt).toLocaleString()}
                          </td>
                          <td className="px-5 py-3">
                            <Badge variant="outline">{subscriber.source}</Badge>
                          </td>
                          {canManage && (
                            <td className="px-5 py-3 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPendingDelete(subscriber);
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                aria-label={`Delete ${subscriber.email}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-border/50 px-5 py-3">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {totalPages} · {total.toLocaleString()}{" "}
                  {filtersActive ? "matching" : "total"}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => changePage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft size={14} />
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => changePage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                  >
                    Next
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete subscriber"
        description={`Remove ${pendingDelete?.email ?? "this subscriber"} from the newsletter list? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
      <ConfirmDialog
        open={pendingBulkDelete}
        onOpenChange={(open) => {
          if (!open) setPendingBulkDelete(false);
        }}
        title="Delete subscribers"
        description={`Remove ${selected.size.toLocaleString()} selected subscriber${selected.size === 1 ? "" : "s"} from the newsletter list? This cannot be undone.`}
        confirmLabel={`Delete ${selected.size.toLocaleString()}`}
        variant="destructive"
        onConfirm={handleBulkDelete}
        loading={deleting}
      />
    </div>
  );
}

// RowCheckbox is a compact checkbox for dense tables (the ui/Checkbox
// primitive is a labeled card meant for forms, not table cells).
function RowCheckbox({
  checked,
  indeterminate = false,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={cn(
        "flex h-4 w-4 items-center justify-center rounded border transition-colors",
        checked || indeterminate
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-input/50 hover:border-primary/50",
      )}
    >
      {indeterminate ? (
        <Minus size={12} strokeWidth={3} />
      ) : checked ? (
        <Check size={12} strokeWidth={3} />
      ) : null}
    </button>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  subvalue,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subvalue?: string;
}) {
  return (
    <Card variant="bubble" className="flex items-center gap-4 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-xl font-semibold text-foreground">{value}</p>
        {subvalue && (
          <p className="text-xs text-muted-foreground">{subvalue}</p>
        )}
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} variant="bubble" className="h-20 animate-pulse p-4">
            <div className="h-4 w-1/3 rounded bg-muted" />
            <div className="mt-3 h-5 w-1/4 rounded bg-muted" />
          </Card>
        ))}
      </div>
      <Card variant="bubble" className="h-72 animate-pulse p-5">
        <div className="h-4 w-full rounded bg-muted" />
        <div className="mt-4 h-4 w-full rounded bg-muted" />
        <div className="mt-4 h-4 w-2/3 rounded bg-muted" />
      </Card>
    </div>
  );
}
