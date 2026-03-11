"use client";

import { useCallback, useEffect, useState } from "react";
import { webhooksApi, type WebhookSubscription } from "@/lib/api";
import { AnimatedCounter } from "@/components/AnimatedCounter";

const EVENT_TYPES = [
  "subscriber.created",
  "subscriber.updated",
  "campaign.sent",
  "automation.entered",
  "automation.completed",
];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function WebhooksPage() {
  const [list, setList] = useState<WebhookSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [url, setUrl] = useState("");
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [secret, setSecret] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; url: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    webhooksApi
      .list()
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredList = list.filter((w) =>
    searchQuery.trim()
      ? w.url.toLowerCase().includes(searchQuery.trim().toLowerCase())
      : true
  );

  const openEdit = (w: WebhookSubscription) => {
    setEditingId(w.id);
    setUrl(w.url);
    setEventTypes(w.event_types ?? []);
    setEnabled(w.enabled);
    setSecret("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setUrl("");
    setEventTypes([]);
    setEnabled(true);
    setSecret("");
  };

  const toggleEventType = (et: string) => {
    setEventTypes((prev) =>
      prev.includes(et) ? prev.filter((e) => e !== et) : [...prev, et]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl || creating || saving) return;
    setError(null);
    const payload = {
      url: trimmedUrl,
      event_types: eventTypes.length > 0 ? eventTypes : undefined,
      enabled,
      ...(secret.trim() ? { secret: secret.trim() } : {}),
    };
    if (editingId != null) {
      setSaving(true);
      webhooksApi
        .update(editingId, payload)
        .then(() => {
          closeForm();
          load();
          setSuccessMessage("Webhook updated.");
          setTimeout(() => setSuccessMessage(null), 4000);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to update"))
        .finally(() => setSaving(false));
    } else {
      setCreating(true);
      webhooksApi
        .create(payload)
        .then(() => {
          closeForm();
          load();
          setSuccessMessage("Webhook created.");
          setTimeout(() => setSuccessMessage(null), 4000);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to create"))
        .finally(() => setCreating(false));
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    const { id } = deleteConfirm;
    setDeletingId(id);
    setError(null);
    webhooksApi
      .delete(id)
      .then(() => {
        setDeleteConfirm(null);
        load();
        setSuccessMessage("Webhook deleted.");
        setTimeout(() => setSuccessMessage(null), 4000);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to delete"))
      .finally(() => setDeletingId(null));
  };

  if (loading && list.length === 0) {
    return (
      <div className="page-root">
        <header className="page-header">
          <div>
            <h1 className="page-title">Webhooks</h1>
            <p className="page-subtitle">Receive real-time events via HTTP POST</p>
          </div>
        </header>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="spinner" />
          <span className="ml-3 text-sm text-muted-dim">Loading webhooks…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-root">
      <header className="page-header animate-in">
        <div>
          <h1 className="page-title">Webhooks</h1>
          <p className="page-subtitle">Receive events when subscribers, campaigns, or automations change</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm((v) => !v);
            if (showForm) closeForm();
            else {
              setEditingId(null);
              setUrl("");
              setEventTypes([]);
              setEnabled(true);
              setSecret("");
            }
          }}
          className="btn-primary"
        >
          {showForm ? "Cancel" : "Add webhook"}
        </button>
      </header>

      <section className="rounded-xl border border-(--card-border) bg-(--card-bg-subtle) p-4 mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-2">How webhooks work</h2>
        <ul className="text-sm text-muted space-y-1 list-disc list-inside">
          <li><strong className="text-foreground">Event delivery</strong> — When an event occurs (e.g. subscriber created, campaign sent), we POST a JSON payload to your URL.</li>
          <li><strong className="text-foreground">Filter events</strong> — Subscribe to specific event types or leave empty to receive all events.</li>
          <li><strong className="text-foreground">Secret</strong> — Optional HMAC secret to verify requests. Your endpoint should validate the signature.</li>
        </ul>
        <p className="text-xs text-muted-dim mt-3 pt-3 border-t border-(--card-border)">
          Disabled webhooks do not receive events. Delete to stop receiving calls permanently.
        </p>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="dash-kpi-card">
          <p className="dash-kpi-value text-foreground">
            <AnimatedCounter value={list.length} />
          </p>
          <p className="dash-kpi-label">Total webhooks</p>
        </div>
        <div className="dash-kpi-card">
          <p className="dash-kpi-value text-foreground">
            <AnimatedCounter value={list.filter((w) => w.enabled).length} />
          </p>
          <p className="dash-kpi-label">Enabled</p>
        </div>
      </section>

      {error && (
        <div className="alert-error animate-in">
          <span>{error}</span>
          <button type="button" onClick={() => { setError(null); load(); }} className="btn-ghost text-sm">Retry</button>
          <button type="button" onClick={() => setError(null)} className="alert-dismiss" aria-label="Dismiss">Dismiss</button>
        </div>
      )}
      {successMessage && (
        <div className="alert-success animate-in">
          <span>{successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage(null)} className="alert-dismiss" aria-label="Dismiss">Dismiss</button>
        </div>
      )}

      {showForm && (
        <div className="section-card add-card animate-in">
          <h2 className="section-title">{editingId != null ? "Edit webhook" : "Add webhook"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label">URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="input-glass w-full max-w-md"
                placeholder="https://your-server.com/webhooks"
                required
              />
            </div>
            <div>
              <label className="field-label">Event types (leave empty for all)</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {EVENT_TYPES.map((et) => (
                  <label key={et} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventTypes.includes(et)}
                      onChange={() => toggleEventType(et)}
                      className="rounded border-(--card-border)"
                    />
                    <span className="text-sm">{et}</span>
                  </label>
                ))}
              </div>
            </div>
            {editingId != null && (
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="rounded border-(--card-border)"
                  />
                  <span className="field-label mb-0">Enabled</span>
                </label>
              </div>
            )}
            <div>
              <label className="field-label">Secret (optional, for HMAC verification)</label>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="input-glass w-full max-w-md"
                placeholder={editingId != null ? "Leave blank to keep existing" : "Optional"}
                autoComplete="new-password"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={creating || saving}>
                {creating ? "Creating…" : saving ? "Saving…" : editingId != null ? "Save changes" : "Add webhook"}
              </button>
              {editingId != null && (
                <button type="button" onClick={closeForm} className="btn-ghost">Cancel</button>
              )}
            </div>
          </form>
        </div>
      )}

      {deleteConfirm && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-webhook-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="delete-webhook-title" className="modal-title">Delete webhook</h2>
              <button type="button" onClick={() => setDeleteConfirm(null)} className="modal-close" aria-label="Close">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="text-muted">
                Delete webhook to <strong className="text-foreground">{deleteConfirm.url}</strong>? It will stop receiving events.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setDeleteConfirm(null)} className="btn-ghost">Cancel</button>
              <button type="button" onClick={handleDeleteConfirm} className="btn-danger disabled:opacity-50" disabled={deletingId !== null}>
                {deletingId !== null ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="section-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="section-title mb-0">Your webhooks</h2>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by URL"
            className="input-glass w-52 sm:w-64"
            aria-label="Search webhooks"
          />
        </div>
        {filteredList.length === 0 ? (
          <div className="empty-state-centered">
            <div className="empty-state-icon" aria-hidden>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            </div>
            <p className="font-semibold text-foreground">No webhooks yet</p>
            <p className="text-sm text-muted-dim mt-1">Add a webhook to receive events when subscribers, campaigns, or automations change.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredList.map((w) => (
              <div
                key={w.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-(--card-border) bg-(--surface) p-3"
              >
                <div>
                  <span className={`badge text-xs mr-2 ${w.enabled ? "badge-sent" : "badge-draft"}`}>
                    {w.enabled ? "Enabled" : "Disabled"}
                  </span>
                  <span className="font-medium break-all">{w.url}</span>
                  <span className="text-muted-dim text-sm ml-2 block sm:inline mt-1 sm:mt-0">
                    {w.event_types?.length ? w.event_types.join(", ") : "All events"} · Added {formatDate(w.created_at)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEdit(w)} className="btn-ghost text-sm">Edit</button>
                  <button type="button" onClick={() => setDeleteConfirm({ id: w.id, url: w.url })} className="btn-danger text-sm py-1.5 px-2.5">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
