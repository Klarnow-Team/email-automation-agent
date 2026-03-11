"use client";

import React, { useEffect, useState, useMemo } from "react";
import { campaignsApi, dashboardApi, segmentsApi, type Campaign, type DashboardOverview, type Segment } from "@/lib/api";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Badge, Button, Modal } from "@/components/ui";
import { CampaignBlockEditor, PREVIEW_VIEWPORTS, type PreviewViewportId } from "@/components/campaign-editor/CampaignBlockEditor";

type StatusFilter = "all" | "draft" | "sent";

const PAGE_SIZE = 5;

/** Build full email HTML for preview: same wrapper as backend + body with optional top image and sample {{name}}/{{email}}. */
function buildEmailPreviewHtml(innerBody: string, imageUrl: string): string {
  const trimmedImage = imageUrl.trim();
  const bodyWithImage = trimmedImage
    ? `<p><img src="${trimmedImage.replace(/"/g, "&quot;")}" alt="Image" style="max-width:100%; height:auto;" /></p>\n${innerBody}`
    : innerBody;
  const withPlaceholders = bodyWithImage
    .replace(/\{\{name\}\}/g, "John")
    .replace(/\{\{email\}\}/g, "john@example.com")
    .replace(/\{\{id\}\}/g, "123")
    .replace(/\{\{unsubscribe_url\}\}/g, "#");
  const wrapper = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>a{color:#6d5ee8;text-decoration:none;}a:hover{text-decoration:underline;}p{margin:0 0 1em;}p:last-child{margin-bottom:0;}h1,h2,h3{color:#141216;margin:0 0 0.5em;font-weight:600;}</style>
</head>
<body style="margin:0;padding:0;background:linear-gradient(180deg,#f0eef4 0%,#f4f3f6 100%);font-family:'Plus Jakarta Sans',system-ui,-apple-system,sans-serif;font-size:16px;line-height:1.6;color:#141216;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:transparent;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08),0 2px 8px rgba(0,0,0,0.04);background-color:#ffffff;border:1px solid #e8e6ec;">
          <tr>
            <td style="padding:24px 32px 32px;">
              <div style="color:#141216;">
${withPlaceholders}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 36px;border-top:1px solid #e8e6ec;background-color:#faf9fc;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="width:50%;vertical-align:top;text-align:left;padding-right:24px;">
                    <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#141216;">Klarnow</p>
                    <p style="margin:0 0 4px;font-size:13px;color:#6b6775;line-height:1.5;">Pendleton Way, Salford, Greater Manchester, M6 5FW</p>
                    <p style="margin:0 0 12px;font-size:13px;color:#6b6775;line-height:1.5;">United Kingdom</p>
                    <p style="margin:0;font-size:13px;color:#6b6775;"><a href="https://x.com/klarnow" style="color:#6d5ee8;text-decoration:none;">X</a> &nbsp; <a href="https://www.instagram.com/klarnow/" style="color:#6d5ee8;text-decoration:none;">Instagram</a> &nbsp; <a href="https://www.linkedin.com/company/klarnow/" style="color:#6d5ee8;text-decoration:none;">LinkedIn</a></p>
                  </td>
                  <td style="width:50%;vertical-align:top;text-align:right;">
                    <p style="margin:0 0 12px;font-size:13px;color:#6b6775;line-height:1.5;">You received this email because you signed up on our website or made a purchase from us.</p>
                    <p style="margin:0;"><a href="#" style="display:inline-block;padding:10px 20px;font-size:14px;font-weight:600;color:#ffffff;background-color:#6d5ee8;border-radius:8px;text-decoration:none;">Unsubscribe</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  return wrapper;
}

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
  /** When creating: null = show type picker; "regular" | "ab" = show form for that type */
  const [campaignType, setCampaignType] = useState<"regular" | "ab" | null>(null);
  const [channel, setChannel] = useState<"email" | "whatsapp">("email");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [editorMode, setEditorMode] = useState<"simple" | "html">("simple");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<PreviewViewportId>("laptop");
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [plainBody, setPlainBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [abSubjectB, setAbSubjectB] = useState("");
  const [abHtmlBodyB, setAbHtmlBodyB] = useState("");
  const [abSplitPercent, setAbSplitPercent] = useState(50);
  /** A/B section visible when campaign type is A/B (derived; no separate checkbox) */
  const isAbCampaign = campaignType === "ab";
  const [creating, setCreating] = useState(false);
  const [analyticsCampaign, setAnalyticsCampaign] = useState<Campaign | null>(null);
  const [nonOpenerCount, setNonOpenerCount] = useState<number | null>(null);
  const [resendNonOpenersCampaign, setResendNonOpenersCampaign] = useState<Campaign | null>(null);
  const [nonOpenerIds, setNonOpenerIds] = useState<number[]>([]);
  const [nonOpenerDraftId, setNonOpenerDraftId] = useState<number | null>(null);
  const [sendingToNonOpeners, setSendingToNonOpeners] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [sendConfirm, setSendConfirm] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [sendSegmentId, setSendSegmentId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const loadInProgressRef = React.useRef(false);
  const mountedRef = React.useRef(true);

  const load = React.useCallback((opts?: { silent?: boolean }) => {
    if (loadInProgressRef.current) return;
    loadInProgressRef.current = true;
    const silent = opts?.silent === true;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    const campaignsTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Campaigns request timed out")), 30000),
    );
    Promise.race([campaignsApi.list(0, 100), campaignsTimeout])
      .then((listData) => {
        if (mountedRef.current) {
          setList(Array.isArray(listData) ? listData : []);
        }
      })
      .catch((e) => {
        if (mountedRef.current && !silent)
          setError(e instanceof Error ? e.message : "Failed to load campaigns");
      })
      .finally(() => {
        if (mountedRef.current && !silent) setLoading(false);
        loadInProgressRef.current = false;
      });
    dashboardApi
      .getOverview()
      .then((overviewData) => {
        if (mountedRef.current && overviewData != null) setOverview(overviewData);
      })
      .catch(() => {
        if (mountedRef.current) setOverview(null);
      });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  useEffect(() => {
    if (sendConfirm) {
      setSendSegmentId(null);
      segmentsApi.list().then(setSegments).catch(() => setSegments([]));
    }
  }, [sendConfirm]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    if (channel === "email" && !htmlBody.trim()) {
      setError("Email body is required. Add at least one block in the Simple editor or enter HTML.");
      return;
    }
    if (channel === "whatsapp" && !plainBody.trim()) {
      setError("WhatsApp message is required");
      return;
    }
    if (campaignType === "ab" && channel === "email") {
      if (!abSubjectB.trim()) {
        setError("A/B split campaign requires variant B subject.");
        return;
      }
      if (!abHtmlBodyB.trim()) {
        setError("A/B split campaign requires variant B HTML body.");
        return;
      }
    }
    setError(null);
    setCreating(true);
    const trimmedImage = imageUrl.trim();
    const bodyHtml =
      channel === "email"
        ? trimmedImage
          ? `<p><img src="${trimmedImage.replace(/"/g, "&quot;")}" alt="Image" style="max-width:100%; height:auto;" /></p>\n${htmlBody}`
          : htmlBody
        : "";
    const payload: Parameters<typeof campaignsApi.create>[0] = {
      name,
      channel,
      subject: subject.trim() || (channel === "whatsapp" ? "WhatsApp broadcast" : "No subject"),
      html_body: bodyHtml,
    };
    if (plainBody.trim()) payload.plain_body = plainBody.trim();
    if (scheduledAt.trim()) payload.scheduled_at = new Date(scheduledAt).toISOString();
    if (campaignType === "ab" && channel === "email" && abSubjectB.trim() && abHtmlBodyB.trim()) {
      payload.ab_subject_b = abSubjectB.trim();
      payload.ab_html_body_b = abHtmlBodyB.trim();
      payload.ab_split_percent = Math.max(0, Math.min(100, abSplitPercent));
    }
    const isEdit = editingCampaign != null;
    const request = isEdit
      ? campaignsApi.update(editingCampaign.id, payload)
      : campaignsApi.create(payload);
    request
      .then(() => {
        if (!isEdit) {
          setName("");
          setSubject("");
          setChannel("email");
          setImageUrl("");
          setHtmlBody("");
          setPlainBody("");
          setScheduledAt("");
          setAbSubjectB("");
          setAbHtmlBodyB("");
          setCampaignType(null);
        }
        setEditingCampaign(null);
        setShowForm(false);
        setCampaignType(null);
        load();
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : (isEdit ? "Failed to update campaign" : "Failed to create campaign"));
      })
      .finally(() => setCreating(false));
  };

  const openSendConfirm = (c: Campaign) => {
    setError(null);
    setSuccessMessage(null);
    setSendConfirm({ id: c.id, name: c.name });
  };

  const openAnalytics = (c: Campaign) => {
    setAnalyticsCampaign(c);
    setNonOpenerCount(null);
    if (c.status === "sent") {
      campaignsApi.getNonOpenerSubscriberIds(c.id).then((r) => setNonOpenerCount(r.count ?? r.subscriber_ids?.length ?? 0)).catch(() => setNonOpenerCount(0));
    }
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

  /** Parse stored html_body into optional top image URL and rest of body (same format as create). */
  function parseHtmlBody(htmlBody: string): { imageUrl: string; body: string } {
    const match = htmlBody.match(/^<p[^>]*>\s*<img[^>]+src="([^"]+)"[^>]*\s*\/?>[\s\S]*?<\/p>\s*\n?/i);
    if (match) {
      const url = match[1].replace(/&quot;/g, '"');
      return { imageUrl: url, body: htmlBody.slice(match[0].length) };
    }
    return { imageUrl: "", body: htmlBody };
  }

  const openEdit = (c: Campaign) => {
    if (c.status !== "draft") return;
    setError(null);
    // Fetch full campaign so we always have html_body (list may omit or truncate it)
    campaignsApi
      .get(c.id)
      .then((full) => {
        setEditingCampaign(full);
        setName(full.name);
        setSubject(full.subject);
        setChannel((full as Campaign & { channel?: string }).channel === "whatsapp" ? "whatsapp" : "email");
        const { imageUrl: parsedImage, body: parsedBody } = parseHtmlBody(full.html_body || "");
        setImageUrl(parsedImage);
        setHtmlBody(parsedBody);
        setPlainBody(full.plain_body || "");
        const isAb = !!(full.ab_subject_b?.trim() && full.ab_html_body_b?.trim());
        setCampaignType(isAb ? "ab" : "regular");
        if (isAb) {
          setAbSubjectB(full.ab_subject_b ?? "");
          setAbHtmlBodyB(full.ab_html_body_b ?? "");
          setAbSplitPercent(Math.max(0, Math.min(100, full.ab_split_percent ?? 50)));
        } else {
          setAbSubjectB("");
          setAbHtmlBodyB("");
          setAbSplitPercent(50);
        }
        setShowForm(true);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load campaign"));
  };

  const closeEdit = () => {
    setEditingCampaign(null);
    setShowForm(false);
    setCampaignType(null);
  };

  const handleSendConfirm = () => {
    if (!sendConfirm) return;
    const { id } = sendConfirm;
    setSendingId(id);
    setSendConfirm(null);
    const body = sendSegmentId != null ? { segment_id: sendSegmentId } : {};
    campaignsApi
      .send(id, body)
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
        setSuccessMessage(`"${campaignName}" deleted.`);
        setTimeout(() => setSuccessMessage(null), 4000);
        // Optimistically remove from list so UI updates even if refetch fails
        setList((prev) => prev.filter((c) => c.id !== id));
        // Refetch in background to sync; silent so a failing refetch doesn't overwrite success message
        loadInProgressRef.current = false;
        load({ silent: true });
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
        <Button
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setCampaignType(null);
              setEditingCampaign(null);
              setCreating(false);
            } else {
              setShowForm(true);
              setCampaignType(null);
              setEditingCampaign(null);
            }
          }}
        >
          {showForm ? "Cancel" : "Create campaign"}
        </Button>
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
            <Button variant="ghost" size="sm" type="button" onClick={() => { setError(null); load(); }}>
              Retry
            </Button>
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

      <Modal
        open={!!sendConfirm}
        onClose={closeSendConfirm}
        title="Send campaign"
        footer={
          <>
            <Button variant="ghost" onClick={closeSendConfirm}>Cancel</Button>
            <Button onClick={handleSendConfirm}>
              {sendSegmentId != null ? "Send to segment" : "Send to all"}
            </Button>
          </>
        }
      >
        {sendConfirm && (
          <>
            <p className="text-[var(--muted)]">
              Send <strong className="text-[var(--foreground)]">{sendConfirm.name}</strong> to{" "}
              {sendSegmentId != null ? "the selected segment" : "all active subscribers"}? This cannot be undone.
            </p>
            <div className="mt-4">
              <label className="field-label">Send to (MailerLite-style)</label>
              <select
                value={sendSegmentId ?? ""}
                onChange={(e) => setSendSegmentId(e.target.value === "" ? null : Number(e.target.value))}
                className="input-glass select-glass w-full mt-1"
              >
                <option value="">All active subscribers</option>
                {segments.map((seg) => (
                  <option key={seg.id} value={seg.id}>{seg.name}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </Modal>

      {analyticsCampaign && analyticsCampaign.status === "sent" && (
        <Modal
          open={true}
          onClose={() => setAnalyticsCampaign(null)}
          title="Campaign analytics"
        >
          <div className="space-y-4">
            <p className="font-medium text-[var(--foreground)]">{analyticsCampaign.name}</p>
            <p className="text-sm text-[var(--muted)] truncate" title={analyticsCampaign.subject}>{analyticsCampaign.subject}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-[var(--card-border)] p-3">
                <p className="text-[var(--muted-dim)]">Sent</p>
                <p className="text-lg font-semibold tabular-nums">{analyticsCampaign.sent_count ?? 0}</p>
              </div>
              <div className="rounded-lg border border-[var(--card-border)] p-3">
                <p className="text-[var(--muted-dim)]">Opens</p>
                <p className="text-lg font-semibold tabular-nums">{analyticsCampaign.opens ?? 0}</p>
              </div>
              <div className="rounded-lg border border-[var(--card-border)] p-3">
                <p className="text-[var(--muted-dim)]">Clicks</p>
                <p className="text-lg font-semibold tabular-nums">{analyticsCampaign.clicks ?? 0}</p>
              </div>
              <div className="rounded-lg border border-[var(--card-border)] p-3">
                <p className="text-[var(--muted-dim)]">Open rate</p>
                <p className="text-lg font-semibold tabular-nums">
                  {(analyticsCampaign.sent_count ?? 0) > 0 ? `${(((analyticsCampaign.opens ?? 0) / (analyticsCampaign.sent_count ?? 1)) * 100).toFixed(1)}%` : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--card-border)] p-3">
                <p className="text-[var(--muted-dim)]">Click rate</p>
                <p className="text-lg font-semibold tabular-nums">
                  {(analyticsCampaign.sent_count ?? 0) > 0 ? `${(((analyticsCampaign.clicks ?? 0) / (analyticsCampaign.sent_count ?? 1)) * 100).toFixed(1)}%` : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--card-border)] p-3">
                <p className="text-[var(--muted-dim)]">Non-openers</p>
                <p className="text-lg font-semibold tabular-nums">{nonOpenerCount ?? "…"}</p>
              </div>
            </div>
            <Button variant="ghost" className="w-full justify-center text-[var(--accent)]" onClick={() => { setAnalyticsCampaign(null); openResendNonOpeners(analyticsCampaign); }}>
              Re-send to non-openers
            </Button>
          </div>
        </Modal>
      )}

      <Modal
        open={!!resendNonOpenersCampaign}
        onClose={() => setResendNonOpenersCampaign(null)}
        title="Re-send to non-openers"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResendNonOpenersCampaign(null)}>Cancel</Button>
            <Button
              onClick={handleSendToNonOpeners}
              disabled={!nonOpenerDraftId || nonOpenerIds.length === 0 || sendingToNonOpeners}
            >
              {sendingToNonOpeners ? "Sending…" : `Send to ${nonOpenerIds.length} non-openers`}
            </Button>
          </>
        }
      >
        {resendNonOpenersCampaign && (
          <>
            <p className="text-[var(--muted)]">
              <strong className="text-[var(--foreground)]">{nonOpenerIds.length}</strong> subscriber{nonOpenerIds.length !== 1 ? "s" : ""} did not open &quot;{resendNonOpenersCampaign.name}&quot;. Send a follow-up campaign to them?
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
          </>
        )}
      </Modal>

      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete campaign"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteConfirm} disabled={deletingId !== null}>
              {deletingId !== null ? "Deleting…" : "Delete"}
            </Button>
          </>
        }
      >
        {deleteConfirm && (
          <p className="text-[var(--muted)]">
            Delete <strong className="text-[var(--foreground)]">{deleteConfirm.name}</strong>? This cannot be undone.
          </p>
        )}
      </Modal>

      <Modal
        open={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Email preview"
        footer={<Button onClick={() => setShowPreviewModal(false)}>Close</Button>}
      >
        <p className="text-sm text-[var(--muted)] mb-3">
          This is how your email will look when sent. Personalization like {`{{name}}`} and {`{{email}}`} are shown as sample values.
        </p>
        <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-medium text-[var(--muted-dim)]">Preview size</span>
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[var(--card-bg-subtle)] border border-[var(--card-border)]" role="group" aria-label="Preview size">
            {PREVIEW_VIEWPORTS.map((v) => {
              const active = previewViewport === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setPreviewViewport(v.id)}
                  title={`${v.label}${v.width ? ` (${v.width}px)` : ""}`}
                  className={`p-2 rounded-md transition-colors ${active ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--muted-dim)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"}`}
                >
                  {v.icon === "phone" && <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
                  {v.icon === "tablet" && <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
                  {v.icon === "laptop" && <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                  {v.icon === "desktop" && <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 17v4" /></svg>}
                  {v.icon === "full" && <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg-subtle)] overflow-auto p-4 flex justify-center">
          <div
            className="rounded-lg border border-[var(--card-border)] bg-[var(--surface)] shadow-inner overflow-hidden transition-all duration-200"
            style={{
              width: previewViewport === "full" ? "100%" : (PREVIEW_VIEWPORTS.find((p) => p.id === previewViewport)?.width ?? 1024),
              maxWidth: "100%",
            }}
          >
            <iframe
              title="Email preview"
              srcDoc={buildEmailPreviewHtml(htmlBody.trim() || "<p><em>Add content in the editor to see a preview.</em></p>", imageUrl)}
              className="border-0 block w-full bg-white"
              style={{ minHeight: "420px", height: "70vh" }}
            />
          </div>
        </div>
      </Modal>

      {/* Campaign type picker (step 1) — skip when editing a draft */}
      {showForm && campaignType === null && !editingCampaign && (
        <div className="section-card add-card animate-in">
          <h2 className="section-title">Choose campaign type</h2>
          <p className="text-sm text-muted mb-4">
            Create a single-version campaign or an A/B split test (two variants; a percentage of recipients get variant B). A/B split is available for email campaigns only.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setCampaignType("regular")}
              className="flex flex-col items-start p-5 rounded-xl border-2 border-(--card-border) bg-(--surface) hover:border-(--accent) hover:bg-(--card-bg-subtle) text-left transition-colors"
            >
              <span className="font-semibold text-foreground">Regular campaign</span>
              <span className="text-sm text-muted mt-1">One subject and one body. All recipients get the same email.</span>
            </button>
            <button
              type="button"
              onClick={() => setCampaignType("ab")}
              className="flex flex-col items-start p-5 rounded-xl border-2 border-(--card-border) bg-(--surface) hover:border-(--accent) hover:bg-(--card-bg-subtle) text-left transition-colors"
            >
              <span className="font-semibold text-foreground">A/B split campaign</span>
              <span className="text-sm text-muted mt-1">Variant A and B (subject + body). You choose the split %; we send and track both.</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => { setShowForm(false); setCampaignType(null); }}
            className="btn-ghost mt-4"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Create or edit campaign form (step 2) */}
      {showForm && (campaignType !== null || editingCampaign != null) && (
        <div className="section-card add-card animate-in">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="section-title mb-0">
              {editingCampaign
                ? `Edit ${campaignType === "ab" ? "A/B " : ""}campaign`
                : `New ${campaignType === "ab" ? "A/B split " : ""}campaign`}
            </h2>
            <button
              type="button"
              onClick={() => (editingCampaign ? closeEdit() : setCampaignType(null))}
              className="text-sm text-(--accent) hover:underline"
            >
              {editingCampaign ? "Cancel" : "Change type"}
            </button>
          </div>
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
              <label className="field-label">Channel</label>
              <div className="flex gap-4 mt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="channel"
                    checked={channel === "email"}
                    onChange={() => setChannel("email")}
                    className="text-(--accent)"
                  />
                  <span className="text-sm">Email</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="channel"
                    checked={channel === "whatsapp"}
                    onChange={() => setChannel("whatsapp")}
                    className="text-(--accent)"
                  />
                  <span className="text-sm">WhatsApp</span>
                </label>
              </div>
              <p className="text-xs text-muted-dim mt-1">
                WhatsApp sends to subscribers who have a phone number. Configure Twilio in .env.
              </p>
            </div>
            {channel === "whatsapp" ? (
              <>
                <div>
                  <label className="field-label">Subject / label (optional)</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="input-glass w-full max-w-md"
                    placeholder="e.g. Broadcast"
                  />
                </div>
                <div>
                  <label className="field-label">Message</label>
                  <textarea
                    value={plainBody}
                    onChange={(e) => setPlainBody(e.target.value)}
                    rows={6}
                    className="input-glass w-full text-sm resize-y"
                    placeholder="Hi {{name}}, this is your broadcast message..."
                    required
                  />
                  <p className="text-xs text-muted-dim mt-1">
                    Use <code className="bg-(--surface-elevated) px-1 rounded">{`{{name}}`}</code>, <code className="bg-(--surface-elevated) px-1 rounded">{`{{email}}`}</code> for personalization. Only subscribers with a phone number will receive this.
                  </p>
                </div>
              </>
            ) : (
              <>
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
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <label className="field-label mb-0">Email body</label>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg border border-(--card-border) p-0.5 bg-(--card-bg-subtle)">
                    <button
                      type="button"
                      onClick={() => setEditorMode("simple")}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${editorMode === "simple" ? "bg-(--surface) text-foreground shadow-sm" : "text-muted-dim hover:text-muted"}`}
                    >
                      Simple editor
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorMode("html")}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${editorMode === "html" ? "bg-(--surface) text-foreground shadow-sm" : "text-muted-dim hover:text-muted"}`}
                    >
                      HTML
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreviewModal(true)}
                  >
                    Preview
                  </Button>
                </div>
              </div>
              {editorMode === "simple" ? (
                <CampaignBlockEditor
                  key={editingCampaign ? `edit-${editingCampaign.id}` : "new"}
                  value={htmlBody}
                  onChange={setHtmlBody}
                  className="mt-2"
                  previewImageUrl={imageUrl}
                />
              ) : (
                <textarea
                  value={htmlBody}
                  onChange={(e) => setHtmlBody(e.target.value)}
                  rows={10}
                  className="input-glass w-full font-mono text-sm resize-y mt-2"
                  placeholder={'<p>Hello {{name}},</p>\n\n<p>Thanks for subscribing. Here\'s your update...</p>\n\n<p>Best,<br/>The Team</p>'}
                  required
                />
              )}
              <p className="text-xs text-muted-dim mt-2">
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
              </>
            )}
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
            {channel === "email" && isAbCampaign && (
            <div className="rounded-xl border border-(--card-border) bg-(--card-bg-subtle) p-4">
              <p className="field-label mb-1">Variant B (A/B split)</p>
              <p className="text-xs text-muted-dim mb-3">Variant A uses the subject and HTML body above. Set variant B below; choose what % of recipients get B (rest get A).</p>
              <div className="space-y-3">
                <div>
                  <label className="field-label text-sm">Variant B subject (required)</label>
                  <input
                    type="text"
                    value={abSubjectB}
                    onChange={(e) => setAbSubjectB(e.target.value)}
                    className="input-glass w-full max-w-md text-sm"
                    placeholder="Subject line B"
                    required
                  />
                </div>
                <div>
                  <label className="field-label text-sm">Variant B HTML body (required)</label>
                  <textarea
                    value={abHtmlBodyB}
                    onChange={(e) => setAbHtmlBodyB(e.target.value)}
                    rows={5}
                    className="input-glass w-full font-mono text-sm resize-y"
                    placeholder="<p>Variant B...</p>"
                    required
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
                  <p className="text-xs text-muted-dim mt-1">e.g. 50 = half get A, half get B.</p>
                </div>
              </div>
            </div>
            )}
            <Button type="submit" disabled={creating}>
              {creating
                ? (editingCampaign ? "Saving…" : "Creating…")
                : editingCampaign
                  ? "Save changes"
                  : channel === "whatsapp"
                    ? "Create WhatsApp campaign"
                    : campaignType === "ab"
                      ? "Create A/B split campaign"
                      : "Create campaign"}
            </Button>
            {campaignType === "ab" && channel === "whatsapp" && (
              <p className="text-xs text-muted-dim">A/B split is only used for email; this will be a regular WhatsApp campaign.</p>
            )}
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
                      {(c as Campaign & { channel?: string }).channel === "whatsapp" && (
                        <span className="badge text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">WhatsApp</span>
                      )}
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
                        {(c as Campaign & { channel?: string }).channel !== "whatsapp" && c.opens != null && ` · ${c.opens} opens`}
                        {(c as Campaign & { channel?: string }).channel !== "whatsapp" && c.clicks != null && ` · ${c.clicks} clicks`}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {c.status === "draft" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="btn-ghost text-sm text-(--accent) hover:bg-[rgba(var(--accent-rgb),0.12)] py-1.5 px-2.5"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openSendConfirm(c)}
                          disabled={sendingId === c.id}
                          className="btn-success text-sm py-1.5 px-2.5 disabled:opacity-50"
                        >
                          {sendingId === c.id ? "Sending…" : "Send"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => openAnalytics(c)}
                          className="btn-ghost text-sm text-(--accent) hover:bg-[rgba(var(--accent-rgb),0.12)]"
                        >
                          View analytics
                        </button>
                        <button
                          type="button"
                          onClick={() => openResendNonOpeners(c)}
                          className="btn-ghost text-sm text-(--accent) hover:bg-[rgba(var(--accent-rgb),0.12)]"
                        >
                          Re-send to non-openers
                        </button>
                      </>
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
