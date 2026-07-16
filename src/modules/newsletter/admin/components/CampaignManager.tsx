import * as React from "react";
import {
  ArrowLeft,
  Eye,
  Megaphone,
  Pencil,
  RefreshCw,
  Rss,
  Send,
  Trash2,
} from "lucide-react";

import { Button } from "@components/ui/Button";
import { Card } from "@components/ui/Card";
import { Badge } from "@components/ui/Badge";
import { ConfirmDialog } from "@components/ui/Dialog";
import { Input } from "@components/ui/Input";
import { Label } from "@components/ui/Label";
import { SearchInput } from "@components/ui/SearchInput";
import { Select } from "@components/ui/Select";
import { Textarea } from "@components/ui/Textarea";
import {
  createCampaign,
  deleteCampaign,
  previewCampaign,
  sendCampaign,
  testCampaign,
  updateCampaign,
} from "../lib/admin-api";
import { useCampaigns, useNewsletterConfig } from "../hooks/useNewsletterAdmin";
import type { Campaign, CampaignInput } from "../types";

interface CampaignManagerProps {
  token: string | null;
  isAdmin: boolean;
  subscriberCount: number;
}

export function CampaignManager({
  token,
  isAdmin,
  subscriberCount,
}: CampaignManagerProps) {
  const { data, error, isLoading, refresh } = useCampaigns(token, true);
  const [composer, setComposer] = React.useState<{
    open: boolean;
    campaign: Campaign | null;
  }>({ open: false, campaign: null });
  const [pendingSend, setPendingSend] = React.useState<Campaign | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<Campaign | null>(
    null,
  );
  const [sending, setSending] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [campaignSearch, setCampaignSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | Campaign["status"]
  >("all");

  const campaigns = React.useMemo(() => data?.campaigns ?? [], [data]);
  const filteredCampaigns = React.useMemo(() => {
    const q = campaignSearch.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (q && !`${c.title} ${c.subject}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [campaigns, campaignSearch, statusFilter]);

  if (composer.open) {
    return (
      <CampaignComposer
        token={token}
        isAdmin={isAdmin}
        subscriberCount={subscriberCount}
        campaign={composer.campaign}
        onDone={() => {
          setComposer({ open: false, campaign: null });
          refresh();
        }}
      />
    );
  }

  const handleSend = async () => {
    if (!token || !pendingSend) return;
    setSending(true);
    setActionError(null);
    try {
      await sendCampaign(token, pendingSend.id);
      setPendingSend(null);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !pendingDelete) return;
    setDeleting(true);
    setActionError(null);
    try {
      await deleteCampaign(token, pendingDelete.id);
      setPendingDelete(null);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-foreground">Campaigns</h2>
        <Button
          onClick={() => setComposer({ open: true, campaign: null })}
          size="sm"
        >
          <Megaphone size={16} />
          New campaign
        </Button>
      </div>

      {actionError && (
        <Card variant="bubble" className="p-4 text-sm text-destructive">
          {actionError}
        </Card>
      )}

      {!isLoading && !error && campaigns.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={campaignSearch}
            onChange={(e) => setCampaignSearch(e.target.value)}
            onClear={() => setCampaignSearch("")}
            placeholder="Search campaigns…"
            className="min-w-[200px] flex-1"
          />
          <div className="flex items-center gap-1.5">
            {(["all", "draft", "sending", "sent"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  statusFilter === status
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <Card variant="bubble" className="h-40 animate-pulse p-5">
          <div className="h-4 w-full rounded bg-muted" />
          <div className="mt-4 h-4 w-2/3 rounded bg-muted" />
        </Card>
      ) : error ? (
        <Card variant="bubble" className="p-8 text-center text-destructive">
          <p>{error}</p>
        </Card>
      ) : campaigns.length === 0 ? (
        <Card variant="bubble" className="p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Megaphone className="h-7 w-7 text-primary" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            No campaigns yet
          </h3>
          <p className="mt-2 text-muted-foreground">
            Compose your first newsletter and send it to{" "}
            {subscriberCount.toLocaleString()} subscriber
            {subscriberCount === 1 ? "" : "s"}.
          </p>
        </Card>
      ) : filteredCampaigns.length === 0 ? (
        <Card variant="bubble" className="p-8 text-center">
          <h3 className="text-lg font-semibold text-foreground">No matches</h3>
          <p className="mt-2 text-muted-foreground">
            No campaigns match the current search or filter.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setCampaignSearch("");
              setStatusFilter("all");
            }}
          >
            Clear search and filters
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} variant="bubble" className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">
                      {campaign.title}
                    </h3>
                    <StatusBadge campaign={campaign} />
                    {campaign.source === "blog-rss" && (
                      <Badge variant="ghost" className="gap-1">
                        <Rss size={12} />
                        Auto
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {campaign.subject} · from {campaign.fromEmail}
                  </p>
                  <CampaignStatsLine campaign={campaign} />
                </div>
                <div className="flex items-center gap-2">
                  {campaign.status === "draft" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setComposer({ open: true, campaign })}
                      >
                        <Pencil size={14} />
                        Edit
                      </Button>
                      {isAdmin && (
                        <Button
                          size="sm"
                          onClick={() => setPendingSend(campaign)}
                          disabled={subscriberCount === 0}
                        >
                          <Send size={14} />
                          Send
                        </Button>
                      )}
                    </>
                  )}
                  {campaign.status === "sending" && (
                    <Badge variant="secondary" className="gap-1">
                      <RefreshCw size={12} className="animate-spin" />
                      Sending
                    </Badge>
                  )}
                  {isAdmin && campaign.status !== "sending" && (
                    <button
                      type="button"
                      onClick={() => setPendingDelete(campaign)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete ${campaign.title}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingSend !== null}
        onOpenChange={(open) => {
          if (!open) setPendingSend(null);
        }}
        title="Send campaign"
        description={`Send "${pendingSend?.title ?? "this campaign"}" to all ${subscriberCount.toLocaleString()} subscribers? This cannot be undone.`}
        confirmLabel="Send to all"
        onConfirm={handleSend}
        loading={sending}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete campaign"
        description={`Delete "${pendingDelete?.title ?? "this campaign"}" and its delivery history? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}

function StatusBadge({ campaign }: { campaign: Campaign }) {
  switch (campaign.status) {
    case "draft":
      return <Badge variant="outline">Draft</Badge>;
    case "sending":
      return <Badge variant="default">Sending</Badge>;
    case "sent":
      return <Badge variant="secondary">Sent</Badge>;
  }
}

function CampaignStatsLine({ campaign }: { campaign: Campaign }) {
  if (campaign.status === "draft") {
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        Created {new Date(campaign.createdAt).toLocaleString()}
      </p>
    );
  }
  const { total, sent, failed } = campaign.stats;
  return (
    <p className="mt-1 text-xs text-muted-foreground">
      {sent.toLocaleString()} / {total.toLocaleString()} delivered
      {failed > 0 && (
        <span className="text-destructive">
          {" "}
          · {failed.toLocaleString()} failed
        </span>
      )}
      {campaign.status === "sent" && campaign.finishedAt
        ? ` · finished ${new Date(campaign.finishedAt).toLocaleString()}`
        : ""}
    </p>
  );
}

interface CampaignComposerProps {
  token: string | null;
  isAdmin: boolean;
  subscriberCount: number;
  campaign: Campaign | null;
  onDone: () => void;
}

function CampaignComposer({
  token,
  isAdmin,
  subscriberCount,
  campaign,
  onDone,
}: CampaignComposerProps) {
  const config = useNewsletterConfig(token);
  const [title, setTitle] = React.useState(campaign?.title ?? "");
  const [subject, setSubject] = React.useState(campaign?.subject ?? "");
  const [fromEmail, setFromEmail] = React.useState(campaign?.fromEmail ?? "");
  const [bodyMarkdown, setBodyMarkdown] = React.useState(
    campaign?.bodyMarkdown ?? "",
  );
  const [savedId, setSavedId] = React.useState<number | null>(
    campaign?.id ?? null,
  );

  const [previewHtml, setPreviewHtml] = React.useState<string | null>(null);
  const [previewing, setPreviewing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [testEmail, setTestEmail] = React.useState("");
  const [testResult, setTestResult] = React.useState<string | null>(null);
  const [pendingSend, setPendingSend] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Default the From address to the server's first configured address
  // (adjust-state-during-render; converges once fromEmail is non-empty).
  const defaultFromEmail = config.data?.fromAddresses[0];
  if (!fromEmail && defaultFromEmail) {
    setFromEmail(defaultFromEmail);
  }

  const fromOptions = React.useMemo(
    () =>
      (config.data?.fromAddresses ?? []).map((addr) => ({
        value: addr,
        label: addr,
      })),
    [config.data],
  );

  const canSave =
    title.trim() !== "" &&
    subject.trim() !== "" &&
    bodyMarkdown.trim() !== "" &&
    fromEmail.trim() !== "";

  const input: CampaignInput = {
    title: title.trim(),
    subject: subject.trim(),
    fromEmail: fromEmail.trim(),
    bodyMarkdown,
  };

  // ensureSaved persists the draft and returns its ID, so test/send work
  // even when the user hasn't explicitly saved first.
  const ensureSaved = async (): Promise<number> => {
    if (!token) throw new Error("Not authenticated");
    if (savedId !== null) {
      await updateCampaign(token, savedId, input);
      return savedId;
    }
    const created = await createCampaign(token, input);
    setSavedId(created.id);
    return created.id;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await ensureSaved();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePreview = async () => {
    if (previewHtml !== null) {
      setPreviewHtml(null);
      return;
    }
    setPreviewing(true);
    setError(null);
    try {
      const result = await previewCampaign(token, bodyMarkdown);
      setPreviewHtml(result.html);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPreviewing(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setError(null);
    setTestResult(null);
    try {
      const id = await ensureSaved();
      const result = await testCampaign(token, id, testEmail.trim());
      setTestResult(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    setError(null);
    try {
      const id = await ensureSaved();
      await sendCampaign(token, id);
      setPendingSend(false);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onDone}>
            <ArrowLeft size={14} />
            Back
          </Button>
          <h2 className="text-lg font-semibold text-foreground">
            {campaign ? "Edit campaign" : "New campaign"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleTogglePreview}
            loading={previewing}
            disabled={bodyMarkdown.trim() === ""}
          >
            <Eye size={16} />
            {previewHtml !== null ? "Hide preview" : "Preview"}
          </Button>
          <Button
            variant="outline"
            onClick={handleSave}
            loading={saving}
            disabled={!canSave}
          >
            Save draft
          </Button>
          {isAdmin && (
            <Button
              onClick={() => setPendingSend(true)}
              disabled={!canSave || subscriberCount === 0}
            >
              <Send size={16} />
              Send to all
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Card variant="bubble" className="p-4 text-sm text-destructive">
          {error}
        </Card>
      )}

      <Card variant="bubble" className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="campaign-title">Internal title</Label>
            <Input
              id="campaign-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="July update"
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="campaign-from">From</Label>
            <Select
              id="campaign-from"
              value={fromEmail}
              onChange={setFromEmail}
              options={fromOptions}
              placeholder={
                config.isLoading ? "Loading addresses…" : "Select address"
              }
              disabled={config.isLoading || fromOptions.length === 0}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="campaign-subject">Subject line</Label>
          <Input
            id="campaign-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What's new at NukeHub"
            maxLength={200}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="campaign-body">Body (Markdown)</Label>
          <Textarea
            id="campaign-body"
            value={bodyMarkdown}
            onChange={(e) => {
              setBodyMarkdown(e.target.value);
              setPreviewHtml(null);
            }}
            placeholder={"Hello!\n\nWrite your newsletter in **Markdown**."}
            rows={14}
            className="font-mono text-sm"
          />
        </div>

        <div className="flex flex-wrap items-end gap-3 border-t border-border/50 pt-4">
          <div className="space-y-2">
            <Label htmlFor="campaign-test-email">Send a test</Label>
            <Input
              id="campaign-test-email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <Button
            variant="outline"
            onClick={handleTest}
            loading={testing}
            disabled={!canSave || testEmail.trim() === ""}
          >
            Send test
          </Button>
          {testResult && (
            <p className="text-sm text-muted-foreground">{testResult}</p>
          )}
        </div>
      </Card>

      {previewHtml !== null && (
        <Card variant="bubble" className="p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Preview (body only, without email chrome)
          </p>
          <iframe
            title="Campaign preview"
            sandbox=""
            srcDoc={previewHtml}
            className="h-96 w-full rounded-lg border border-border/50 bg-white"
          />
        </Card>
      )}

      <ConfirmDialog
        open={pendingSend}
        onOpenChange={setPendingSend}
        title="Send campaign"
        description={`Save and send "${title || "this campaign"}" to all ${subscriberCount.toLocaleString()} subscribers? This cannot be undone.`}
        confirmLabel="Send to all"
        onConfirm={handleSend}
        loading={sending}
      />
    </div>
  );
}
