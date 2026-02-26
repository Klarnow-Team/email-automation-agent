"use client";

import React, { useEffect, useState, useMemo } from "react";
import { campaignsApi, dashboardApi, type Campaign, type DashboardOverview } from "@/lib/api";
import { AnimatedCounter } from "@/components/AnimatedCounter";

type StatusFilter = "all" | "draft" | "sent";

const PAGE_SIZE = 5;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function CampaignsPage() {
  const [list, setList] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [plainBody, setPlainBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [abSubjectB, setAbSubjectB] = useState("");
  const [abHtmlBodyB, setAbHtmlBodyB] = useState("");
  const [abSplitPercent, setAbSplitPercent] = useState(50);
  const [showAb, setShowAb] = useState(false);
  const [creating, setCreating] = useState(false);
  const [resendNonOpenersCampaign, setResendNonOpenersCampaign] = useState<Campaign | null>(null);
  const [nonOpenerIds, setNonOpenerIds] = useState<number[]>([]);
  const [nonOpenerDraftId, setNonOpenerDraftId] = useState<number | null>(null);
  const [sendingToNonOpeners, setSendingToNonOpeners] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [sendConfirm, setSendConfirm] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const loadInProgressRef = React.useRef(false);
  const mountedRef = React.useRef(true);

  const load = React.useCallback(() => {
    if (loadInProgressRef.current) return;
    loadInProgressRef.current = true;
    setLoading(true);
    setError(null);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), 15000),
    );
    Promise.race([
      Promise.all([
        campaignsApi.list(0, 100),
        dashboardApi.getOverview().catch(() => null),
      ]),
      timeout,
    ])
      .then(([listData, overviewData]) => {
        if (mountedRef.current) {
          setList(Array.isArray(listData) ? listData : []);
          setOverview(overviewData ?? null);
        }
      })
      .catch((e) => {
        if (mountedRef.current)
          setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        loadInProgressRef.current = false;
        if (mountedRef.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    setError(null);
    setCreating(true);
    const trimmedImage = imageUrl.trim();
    const bodyHtml = trimmedImage
      ? `<p><img src="${trimmedImage.replace(/"/g, "&quot;")}" alt="Image" style="max-width:100%; height:auto;" /></p>\n${htmlBody}`
      : htmlBody;
    const payload: Parameters<typeof campaignsApi.create>[0] = {
      name,
      subject,
      html_body: bodyHtml,
    };
    if (plainBody.trim()) payload.plain_body = plainBody.trim();
    if (scheduledAt.trim()) payload.scheduled_at = new Date(scheduledAt).toISOString();
    if (showAb && abSubjectB.trim() && abHtmlBodyB.trim()) {
      payload.ab_subject_b = abSubjectB.trim();
      payload.ab_html_body_b = abHtmlBodyB.trim();
      payload.ab_split_percent = Math.max(0, Math.min(100, abSplitPercent));
    }
    campaignsApi
      .create(payload)
      .then(() => {
        setName("");
        setSubject("");
        setImageUrl("");
        setHtmlBody("");
        setPlainBody("");
        setScheduledAt("");
        setAbSubjectB("");
        setAbHtmlBodyB("");
        setShowAb(false);
        setShowForm(false);
        load();
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to create campaign");
      })
      .finally(() => setCreating(false));
  };

  const openSendConfirm = (c: Campaign) => {
    setError(null);
    setSuccessMessage(null);
    setSendConfirm({ id: c.id, name: c.name });
  };

  const openResendNonOpeners = (c: Campaign) => {
    setResendNonOpenersCampaign(c);
    setNonOpenerDraftId(null);
    campaignsApi.getNonOpenerSubscriberIds(c.id).then((r) => setNonOpenerIds(r.subscriber_ids || [])).catch(() => setNonOpenerIds([]));
  };

  const handleSendToNonOpeners = () => {
    if (!nonOpenerDraftId || nonOpenerIds.length === 0 || sendingToNonOpeners) return;
    setSendingToNonOpeners(true);
    campaignsApi
      .send(nonOpenerDraftId, { recipient_ids: nonOpenerIds })
      .then((res) => {
        setSuccessMessage(res?.message ?? `Sent to ${res?.sent ?? 0} non-openers.`);
        setResendNonOpenersCampaign(null);
        load();
        setTimeout(() => setSuccessMessage(null), 6000);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Send failed"))
      .finally(() => setSendingToNonOpeners(false));
  };

  const closeSendConfirm = () => setSendConfirm(null);

  const handleSendConfirm = () => {
    if (!sendConfirm) return;
    const { id } = sendConfirm;
    setSendingId(id);
    setSendConfirm(null);
    campaignsApi
      .send(id, {})
      .then((res) => {
        setSuccessMessage(
          res?.message ?? `Campaign sent to ${res?.sent ?? 0} subscribers.`,
        );
        load();
        setTimeout(() => setSuccessMessage(null), 8000);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Send failed"))
      .finally(() => setSendingId(null));
  };

  useEffect(() => {
    if (!sendConfirm) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSendConfirm();
    };
    document.addEventListener("keydown", onEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "";
    };
  }, [sendConfirm]);

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    const { id, name: campaignName } = deleteConfirm;
    setDeletingId(id);
    setError(null);
    campaignsApi
      .delete(id)
      .then(() => {
        setDeleteConfirm(null);
        load();
        setSuccessMessage(`"${campaignName}" deleted.`);
        setTimeout(() => setSuccessMessage(null), 4000);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to delete"))
      .finally(() => setDeletingId(null));
  };

  useEffect(() => {
    if (!deleteConfirm) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDeleteConfirm(null);
    };
    document.addEventListener("keydown", onEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "";
    };
  }, [deleteConfirm]);

  const filteredList = useMemo(() => {
    let out = list;
    if (statusFilter === "draft") out = out.filter((c) => c.status === "draft");
    if (statusFilter === "sent") out = out.filter((c) => c.status === "sent");
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      out = out.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.subject.toLowerCase().includes(q),
      );
    }
    return out;
  }, [list, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const paginatedList = useMemo(
    () =>
      filteredList.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [filteredList, page],
  );

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  const sent = list.filter((c) => c.status === "sent").length;
  const drafts = list.filter((c) => c.status === "draft").length;

  return (
    <div className="page-root campaigns-page">
      <header className="page-header animate-in">
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="page-subtitle">Create and send email campaigns</p>
        </div>
        <button
          onClick={() => {
            setShowForm((v) => !v);
            if (showForm) setCreating(false);
          }}
          className="btn-primary"
        >
          {showForm ? "Cancel" : "Create campaign"}
        </button>
      </header>

      {/* How campaigns work */}
      <section className="rounded-xl border border-(--card-border) bg-(--card-bg-subtle) p-4 mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-2">How campaigns work</h2>
        <ul className="text-sm text-muted space-y-1 list-disc list-inside">
          <li><strong className="text-foreground">Create a draft</strong> — Add name, subject, optional image, and HTML body. Save as draft to edit later.</li>
          <li><strong className="text-foreground">Send to subscribers</strong> — When ready, send the campaign to all active subscribers. Sending cannot be undone.</li>
          <li><strong className="text-foreground">Track results</strong> — Sent campaigns appear in your list; use the dashboard to see opens, clicks, and delivery.</li>
        </ul>
        <p className="text-xs text-muted-dim mt-3 pt-3 border-t border-(--card-border)">
          Drafts stay in your list until you send or delete them. You can duplicate a sent campaign from the dashboard to reuse content.
        </p>
      </section>

      {/* KPIs — same order and source as dashboard "Campaign performance", then campaign counts */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
        <div className="dash-kpi-card">
          <p className="dash-kpi-value text-foreground">
            <AnimatedCounter value={overview?.campaign_performance?.emails_sent ?? 0} />
          </p>
          <p className="dash-kpi-label">Sent</p>
        </div>
        <div className="dash-kpi-card">
          <p className="dash-kpi-value text-foreground">
            <AnimatedCounter value={overview?.campaign_performance?.opens ?? 0} />
          </p>
          <p className="dash-kpi-label">Opens</p>
        </div>
        <div className="dash-kpi-card">
          <p className="dash-kpi-value text-foreground">
            <AnimatedCounter value={overview?.campaign_performance?.clicks ?? 0} />
          </p>
          <p className="dash-kpi-label">Clicks</p>
        </div>
        <div className="dash-kpi-card">
          <p className="dash-kpi-value text-foreground">
            <AnimatedCounter value={list.length} />
          </p>
          <p className="dash-kpi-label">Campaigns</p>
        </div>
        <div className="dash-kpi-card">
          <p className="dash-kpi-value text-success">
            <AnimatedCounter value={sent} />
          </p>
          <p className="dash-kpi-label">Sent campaigns</p>
        </div>
        <div className="dash-kpi-card">
          <p className="dash-kpi-value text-warning">
            <AnimatedCounter value={drafts} />
          </p>
          <p className="dash-kpi-label">Drafts</p>
        </div>
      </section>

      {error && (
        <div className="alert-error animate-in">
          <span>{error}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setError(null);
                load();
              }}
              className="btn-ghost text-sm"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => setError(null)}
              className="alert-dismiss"
              aria-label="Dismiss"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="alert-success animate-in">
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="alert-dismiss"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Send confirm modal */}
      {sendConfirm && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && closeSendConfirm()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="send-confirm-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="send-confirm-title" className="modal-title">
                Send campaign
              </h2>
              <button
                type="button"
                onClick={closeSendConfirm}
                className="modal-close"
                aria-label="Close"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="text-muted">
                Send{" "}
                <strong className="text-foreground">{sendConfirm.name}</strong>{" "}
                to all active subscribers? This cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={closeSendConfirm}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendConfirm}
                className="btn-success"
              >
                Send to all
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re-send to non-openers modal */}
      {resendNonOpenersCampaign && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setResendNonOpenersCampaign(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="resend-non-openers-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="resend-non-openers-title" className="modal-title">Re-send to non-openers</h2>
              <button type="button" onClick={() => setResendNonOpenersCampaign(null)} className="modal-close" aria-label="Close">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="text-muted">
                <strong className="text-foreground">{nonOpenerIds.length}</strong> subscriber{nonOpenerIds.length !== 1 ? "s" : ""} did not open &quot;{resendNonOpenersCampaign.name}&quot;. Send a follow-up campaign to them?
              </p>
              <div className="mt-4">
                <label className="field-label">Choose a draft campaign to send</label>
                <select
                  value={nonOpenerDraftId ?? ""}
                  onChange={(e) => setNonOpenerDraftId(e.target.value === "" ? null : Number(e.target.value))}
                  className="input-glass select-glass w-full mt-1"
                >
                  <option value="">— Select draft —</option>
                  {list.filter((c) => c.status === "draft").map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setResendNonOpenersCampaign(null)} className="btn-ghost">Cancel</button>
              <button
                type="button"
                onClick={handleSendToNonOpeners}
                className="btn-success disabled:opacity-50"
                disabled={!nonOpenerDraftId || nonOpenerIds.length === 0 || sendingToNonOpeners}
              >
                {sendingToNonOpeners ? "Sending…" : `Send to ${nonOpenerIds.length} non-openers`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-campaign-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="delete-campaign-title" className="modal-title">Delete campaign</h2>
              <button type="button" onClick={() => setDeleteConfirm(null)} className="modal-close" aria-label="Close">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="text-muted">
                Delete <strong className="text-foreground">{deleteConfirm.name}</strong>? This cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setDeleteConfirm(null)} className="btn-ghost">Cancel</button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="btn-danger disabled:opacity-50"
                disabled={deletingId !== null}
              >
                {deletingId !== null ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create campaign form */}
      {showForm && (
        <div className="section-card add-card animate-in">
          <h2 className="section-title">New campaign</h2>
          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <label className="field-label">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-glass w-full max-w-md"
                placeholder="e.g. Weekly digest"
                required
              />
            </div>
            <div>
              <label className="field-label">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="input-glass w-full max-w-md"
                placeholder="Email subject line"
                required
              />
            </div>
            <div>
              <label className="field-label">Image URL (optional)</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="input-glass w-full max-w-md"
                placeholder="https://example.com/image.jpg"
              />
              <p className="text-xs text-muted-dim mt-1">
                Image will appear at the top of the email.
              </p>
              {imageUrl.trim() && (
                <>
                  <div className="mt-2 rounded-lg overflow-hidden border border-(--card-border) bg-(--surface) inline-block max-w-xs">
                    <img
                      src={imageUrl.trim()}
                      alt="Preview"
                      className="max-w-full h-auto max-h-40 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="btn-ghost text-sm text-muted-dim hover:text-foreground mt-2"
                  >
                    Remove image
                  </button>
                </>
              )}
            </div>
            <div>
              <label className="field-label">HTML body</label>
              <textarea
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
                rows={10}
                className="input-glass w-full font-mono text-sm resize-y"
                placeholder={'<p>Hello {{name}},</p>\n\n<p>Thanks for subscribing. Here\'s your update...</p>\n\n<p>Best,<br/>The Team</p>'}
                required
              />
              <p className="text-xs text-muted-dim mt-1">
                Use <code className="bg-(--surface-elevated) px-1 rounded">{`{{name}}`}</code>, <code className="bg-(--surface-elevated) px-1 rounded">{`{{email}}`}</code> for personalization. Emails are sent in a themed layout with an <strong>Unsubscribe</strong> link added automatically.
              </p>
            </div>
            <div>
              <label className="field-label">Plain-text body (optional)</label>
              <textarea
                value={plainBody}
                onChange={(e) => setPlainBody(e.target.value)}
                rows={4}
                className="input-glass w-full text-sm resize-y"
                placeholder="Plain text version for clients that don't support HTML"
              />
            </div>
            <div>
              <label className="field-label">Schedule send (optional)</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="input-glass max-w-xs"
              />
              <p className="text-xs text-muted-dim mt-1">Campaign will be sent automatically at this time (call the process-scheduled-campaigns worker).</p>
            </div>
            <div className="rounded-xl border border-(--card-border) bg-(--card-bg-subtle) p-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAb}
                  onChange={(e) => setShowAb(e.target.checked)}
                  className="rounded border-(--card-border)"
                />
                <span className="field-label mb-0">A/B test (variant B)</span>
              </label>
              <p className="text-xs text-muted-dim mt-1 mb-3">Send a percentage of recipients variant B (subject + body). Rest get variant A.</p>
              {showAb && (
                <div className="space-y-3">
                  <div>
                    <label className="field-label text-sm">Variant B subject</label>
                    <input
                      type="text"
                      value={abSubjectB}
                      onChange={(e) => setAbSubjectB(e.target.value)}
                      className="input-glass w-full max-w-md text-sm"
                      placeholder="Subject line B"
                    />
                  </div>
                  <div>
                    <label className="field-label text-sm">Variant B HTML body</label>
                    <textarea
                      value={abHtmlBodyB}
                      onChange={(e) => setAbHtmlBodyB(e.target.value)}
                      rows={5}
                      className="input-glass w-full font-mono text-sm resize-y"
                      placeholder="<p>Variant B...</p>"
                    />
                  </div>
                  <div>
                    <label className="field-label text-sm">Send B to % of recipients (0–100)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={abSplitPercent}
                      onChange={(e) => setAbSplitPercent(Number(e.target.value) || 50)}
                      className="input-glass w-24"
                    />
                  </div>
                </div>
              )}
            </div>
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? "Creating…" : "Create campaign"}
            </button>
          </form>
        </div>
      )}

      {/* Campaign list — search, status filter, cards */}
      <section className="section-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="section-title mb-0">Your campaigns</h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-muted-dim">
                <svg
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name or subject"
                className="input-glass pl-11 w-52 sm:w-64"
                aria-label="Search campaigns"
              />
            </div>
            <div className="flex rounded-lg border border-(--card-border) p-0.5 bg-(--card-bg-subtle)">
              {(["all", "draft", "sent"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    statusFilter === s
                      ? "bg-(--surface) text-foreground shadow-sm"
                      : "text-muted-dim hover:text-muted"
                  }`}
                >
                  {s === "all" ? "All" : s === "draft" ? "Drafts" : "Sent"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && list.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center gap-3 py-12">
            <div className="spinner" />
            <span className="text-sm text-muted-dim">Loading campaigns…</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="empty-state-centered">
            <div className="empty-state-icon" aria-hidden>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            {list.length === 0 ? (
              <>
                <p className="font-semibold text-foreground">
                  No campaigns yet
                </p>
                <p className="text-sm text-muted-dim mt-1">
                  Create one to start sending.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-foreground">No matches</p>
                <p className="text-sm text-muted-dim mt-1">
                  Try a different search or filter.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  className="btn-ghost mt-3 text-sm"
                >
                  Clear filters
                </button>
              </>
            )}
          </div>
        ) : (
          <>
          <div className="space-y-4">
            {paginatedList.map((c) => (
              <div key={c.id} className="rounded-xl border border-(--card-border) bg-(--surface) p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="list-card-title mb-0">{c.name}</p>
                      <span
                        className={`badge text-xs ${c.status === "sent" ? "badge-sent" : "badge-draft"}`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-dim mt-1 truncate max-w-full" title={c.subject}>
                      {c.subject}
                    </p>
                    <p className="text-xs text-muted-dim mt-1 tabular-nums">
                      {c.status === "sent"
                        ? `Sent ${formatDate(c.sent_at)}`
                        : `Created ${formatDate(c.created_at)}`}
                    </p>
                    {c.status === "sent" && (c.sent_count != null || c.opens != null || c.clicks != null) && (
                      <p className="text-xs text-muted-dim mt-1 tabular-nums">
                        {c.sent_count != null && `${c.sent_count} sent`}
                        {c.opens != null && ` · ${c.opens} opens`}
                        {c.clicks != null && ` · ${c.clicks} clicks`}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {c.status === "draft" ? (
                      <button
                        type="button"
                        onClick={() => openSendConfirm(c)}
                        disabled={sendingId === c.id}
                        className="btn-success text-sm py-1.5 px-2.5 disabled:opacity-50"
                      >
                        {sendingId === c.id ? "Sending…" : "Send"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openResendNonOpeners(c)}
                        className="btn-ghost text-sm text-(--accent) hover:bg-[rgba(var(--accent-rgb),0.12)]"
                      >
                        Re-send to non-openers
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm({ id: c.id, name: c.name })}
                      className="btn-danger text-sm py-1.5 px-2.5"
                      title="Delete this campaign"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-dim mt-3 pt-3 border-t border-(--card-border)">
                  {c.status === "draft"
                    ? "Send to all active subscribers when ready. This cannot be undone."
                    : "Opens and clicks are tracked when recipients load the email or click links. View totals on the dashboard."}
                </p>
              </div>
            ))}
          </div>
            <nav
              className="dash-pagination mt-4"
              aria-label="Campaign list pagination"
            >
              <button
                type="button"
                className="dash-pagination-btn"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </button>
              <span className="dash-pagination-info">
                Page {page + 1} of {totalPages}
              </span>
              <button
                type="button"
                className="dash-pagination-btn"
                disabled={page >= totalPages - 1}
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
              >
                Next
              </button>
            </nav>
          </>
        )}
      </section>
    </div>
  );
}
