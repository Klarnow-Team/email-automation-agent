"use client";

import { useCallback, useEffect, useState } from "react";
import { suppressionApi, type SuppressionEntry } from "@/lib/api";
import { AnimatedCounter } from "@/components/AnimatedCounter";

function formatDate(iso: string | null | undefined): string {
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

export default function SuppressionPage() {
  const [list, setList] = useState<SuppressionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<"email" | "domain">("email");
  const [value, setValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<SuppressionEntry | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<"all" | "email" | "domain">("all");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    suppressionApi
      .list()
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredList =
    filterType === "all"
      ? list
      : list.filter((e) => e.type === filterType);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim().toLowerCase();
    if (!trimmed || adding) return;
    setError(null);
    setAdding(true);
    suppressionApi
      .add({ type, value: type === "domain" ? trimmed.replace(/^@/, "") : trimmed })
      .then(() => {
        setValue("");
        setShowForm(false);
        load();
        setSuccessMessage("Added to suppression list.");
        setTimeout(() => setSuccessMessage(null), 4000);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to add"))
      .finally(() => setAdding(false));
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm.id;
    setDeletingId(id);
    setError(null);
    suppressionApi
      .remove(id)
      .then(() => {
        setDeleteConfirm(null);
        load();
        setSuccessMessage("Removed from suppression list.");
        setTimeout(() => setSuccessMessage(null), 4000);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to remove"))
      .finally(() => setDeletingId(null));
  };

  if (loading && list.length === 0) {
    return (
      <div className="page-root">
        <header className="page-header">
          <div>
            <h1 className="page-title">Suppression list</h1>
            <p className="page-subtitle">Block emails or domains from campaigns</p>
          </div>
        </header>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="spinner" />
          <span className="ml-3 text-sm text-muted-dim">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-root">
      <header className="page-header animate-in">
        <div>
          <h1 className="page-title">Suppression list</h1>
          <p className="page-subtitle">Emails and domains on this list will not receive campaigns</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm((v) => !v);
            setValue("");
            setError(null);
          }}
          className="btn-primary"
        >
          {showForm ? "Cancel" : "Add entry"}
        </button>
      </header>

      <section className="rounded-xl border border-(--card-border) bg-(--card-bg-subtle) p-4 mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-2">How suppression works</h2>
        <ul className="text-sm text-muted space-y-1 list-disc list-inside">
          <li><strong className="text-foreground">Email</strong> — Block a single address (e.g. bounce@example.com).</li>
          <li><strong className="text-foreground">Domain</strong> — Block all addresses at a domain (e.g. example.com blocks *@example.com).</li>
        </ul>
        <p className="text-xs text-muted-dim mt-3 pt-3 border-t border-(--card-border)">
          Suppressed addresses are excluded when sending campaigns. Add bounces or unsubscribes here to avoid sending again.
        </p>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="dash-kpi-card">
          <p className="dash-kpi-value text-foreground">
            <AnimatedCounter value={list.length} />
          </p>
          <p className="dash-kpi-label">Total entries</p>
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
          <h2 className="section-title">Add to suppression list</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="field-label">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "email" | "domain")}
                className="input-glass select-glass max-w-xs"
              >
                <option value="email">Email</option>
                <option value="domain">Domain</option>
              </select>
            </div>
            <div>
              <label className="field-label">{type === "email" ? "Email address" : "Domain (e.g. example.com)"}</label>
              <input
                type={type === "email" ? "email" : "text"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="input-glass w-full max-w-md"
                placeholder={type === "email" ? "user@example.com" : "example.com"}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={adding}>
              {adding ? "Adding…" : "Add"}
            </button>
          </form>
        </div>
      )}

      {deleteConfirm && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-suppression-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="delete-suppression-title" className="modal-title">Remove from suppression list</h2>
              <button type="button" onClick={() => setDeleteConfirm(null)} className="modal-close" aria-label="Close">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="text-muted">
                Remove <strong className="text-foreground">{deleteConfirm.type}: {deleteConfirm.value}</strong>? They will be able to receive campaigns again.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setDeleteConfirm(null)} className="btn-ghost">Cancel</button>
              <button type="button" onClick={handleDeleteConfirm} className="btn-danger disabled:opacity-50" disabled={deletingId !== null}>
                {deletingId !== null ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="section-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="section-title mb-0">Suppressed entries</h2>
          <div className="flex rounded-lg border border-(--card-border) p-0.5 bg-(--card-bg-subtle)">
            {(["all", "email", "domain"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterType(s)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  filterType === s ? "bg-(--surface) text-foreground shadow-sm" : "text-muted-dim hover:text-muted"
                }`}
              >
                {s === "all" ? "All" : s === "email" ? "Emails" : "Domains"}
              </button>
            ))}
          </div>
        </div>
        {filteredList.length === 0 ? (
          <div className="empty-state-centered">
            <div className="empty-state-icon" aria-hidden>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
            </div>
            <p className="font-semibold text-foreground">No suppressed entries</p>
            <p className="text-sm text-muted-dim mt-1">Add emails or domains to block them from receiving campaigns.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredList.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-(--card-border) bg-(--surface) p-3"
              >
                <div>
                  <span className={`badge text-xs mr-2 ${entry.type === "email" ? "badge-draft" : "badge-sent"}`}>
                    {entry.type}
                  </span>
                  <span className="font-medium">{entry.value}</span>
                  <span className="text-muted-dim text-sm ml-2">Added {formatDate(entry.created_at)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(entry)}
                  className="btn-ghost text-sm text-danger hover:bg-danger-muted"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
