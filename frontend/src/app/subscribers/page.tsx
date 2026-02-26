"use client";

import { useEffect, useState, useMemo } from "react";
import { subscribersApi, type Subscriber } from "@/lib/api";
import { AnimatedCounter } from "@/components/AnimatedCounter";

const PAGE_SIZE = 15;
const SEVEN_DAYS_AGO = Date.now() - 7 * 24 * 60 * 60 * 1000;

function formatRelative(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function SubscribersPage() {
  const [list, setList] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [addingSubscriber, setAddingSubscriber] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; email: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    subscribersApi
      .list(0, 500)
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || addingSubscriber) return;
    setAddingSubscriber(true);
    setError(null);
    subscribersApi
      .create({ email: email.trim(), name: name.trim() || undefined })
      .then(() => {
        setEmail("");
        setName("");
        load();
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to add"))
      .finally(() => setAddingSubscriber(false));
  };

  const getImportCount = () => {
    const lines = importText
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    return lines.filter((line) => {
      const parts = parseCsvLine(line);
      return parts[0] && parts[0].length > 0;
    }).length;
  };

  function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    const sep = line.includes("\t") ? "\t" : ",";
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        i += 1;
        let cell = "";
        while (i < line.length) {
          if (line[i] === '"') {
            i += 1;
            if (line[i] === '"') {
              cell += '"';
              i += 1;
            } else break;
          } else {
            cell += line[i];
            i += 1;
          }
        }
        result.push(cell.trim());
      } else {
        const end = line.indexOf(sep, i);
        const slice = end === -1 ? line.slice(i) : line.slice(i, end);
        result.push(slice.trim().replace(/^"|"$/g, ""));
        i = end === -1 ? line.length : end + 1;
      }
    }
    return result;
  }

  const parseImportTextToItems = (
    text: string,
  ): { email: string; name?: string }[] => {
    return text
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = parseCsvLine(line);
        return { email: parts[0] || "", name: parts[1] || undefined };
      })
      .filter((x) => x.email);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImportText(String(reader.result ?? ""));
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    const items = parseImportTextToItems(importText);
    if (items.length === 0 || importing) return;
    setImporting(true);
    setError(null);
    subscribersApi
      .import(items)
      .then(() => {
        setImportText("");
        setShowImport(false);
        load();
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Import failed"))
      .finally(() => setImporting(false));
  };

  const closeImportModal = () => setShowImport(false);

  useEffect(() => {
    if (!showImport) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeImportModal();
    };
    document.addEventListener("keydown", onEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "";
    };
  }, [showImport]);

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    const { id } = deleteConfirm;
    setDeletingId(id);
    setError(null);
    subscribersApi
      .delete(id)
      .then(() => {
        setDeleteConfirm(null);
        load();
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Delete failed"))
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

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email).then(() => {
      setCopiedId(email);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.trim().toLowerCase();
    return list.filter(
      (s) =>
        s.email.toLowerCase().includes(q) ||
        (s.name ?? "").toLowerCase().includes(q),
    );
  }, [list, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const paginatedList = useMemo(
    () => filteredList.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [filteredList, page],
  );

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  const newThisWeek = list.filter(
    (s) => new Date(s.created_at).getTime() >= SEVEN_DAYS_AGO,
  ).length;
  const withName = list.filter((s) => s.name && s.name.trim()).length;

  if (loading && list.length === 0)
    return (
      <div className="page-root">
        <header className="page-header">
          <div>
            <h1 className="page-title">Subscribers</h1>
            <p className="page-subtitle">
              Add, import, and manage your email list
            </p>
          </div>
        </header>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="spinner" />
          <span className="ml-3 text-sm text-muted-dim">
            Loading subscribers…
          </span>
        </div>
      </div>
    );

  return (
    <div className="page-root subscribers-page">
      <header className="page-header animate-in">
        <div>
          <h1 className="page-title">Subscribers</h1>
          <p className="page-subtitle">
            Add, import, and manage your email list
          </p>
        </div>
      </header>

      {/* How subscribers work */}
      <section className="rounded-xl border border-(--card-border) bg-(--card-bg-subtle) p-4 mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-2">How subscribers work</h2>
        <ul className="text-sm text-muted space-y-1 list-disc list-inside">
          <li><strong className="text-foreground">Add or import</strong> — Add one subscriber at a time or bulk import from CSV (email, optional name). New subscribers enter active automations.</li>
          <li><strong className="text-foreground">Status</strong> — Subscribers are &quot;active&quot; by default and receive campaigns; you can mark them inactive if needed.</li>
          <li><strong className="text-foreground">Use everywhere</strong> — Send campaigns to active subscribers; use segments to target by status, email, or name.</li>
        </ul>
        <p className="text-xs text-muted-dim mt-3 pt-3 border-t border-(--card-border)">
          Search by email or name. Delete removes a subscriber from your list and stops any future automation emails.
        </p>
      </section>

      {/* KPI stats — bento style */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="dash-kpi-card">
          <p className="dash-kpi-value text-foreground">
            <AnimatedCounter value={list.length} />
          </p>
          <p className="dash-kpi-label">Total</p>
        </div>
        <div className="dash-kpi-card">
          <p className="dash-kpi-value text-success">
            <AnimatedCounter value={newThisWeek} />
          </p>
          <p className="dash-kpi-label">New this week</p>
        </div>
        <div className="dash-kpi-card">
          <p className="dash-kpi-value text-foreground">
            <AnimatedCounter value={withName} />
          </p>
          <p className="dash-kpi-label">With name</p>
        </div>
        <div className="dash-kpi-card">
          <p className="dash-kpi-value text-foreground">
            <AnimatedCounter value={filteredList.length} />
          </p>
          <p className="dash-kpi-label">
            {searchQuery.trim() ? "Filtered" : "Listed"}
          </p>
        </div>
      </section>

      {error && (
        <div className="alert-error animate-in">
          <span>{error}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setError(null); load(); }} className="btn-ghost text-sm">Retry</button>
            <button type="button" onClick={() => setError(null)} className="alert-dismiss" aria-label="Dismiss">Dismiss</button>
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
          aria-labelledby="delete-subscriber-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="delete-subscriber-title" className="modal-title">Delete subscriber</h2>
              <button type="button" onClick={() => setDeleteConfirm(null)} className="modal-close" aria-label="Close">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="text-muted">
                Remove <strong className="text-foreground">{deleteConfirm.email}</strong> from your list? This cannot be undone. They will stop receiving automation emails.
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

      {/* Add + Import — compact card */}
      <div className="section-card subscribers-add-card">
        <div className="flex flex-wrap items-end gap-4">
          <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="subscribers-field-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-glass w-56"
                placeholder="you@example.com"
                required
                disabled={addingSubscriber}
              />
            </div>
            <div>
              <label className="subscribers-field-label">Name (optional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-glass w-40"
                placeholder="Name"
                disabled={addingSubscriber}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={addingSubscriber}>
              {addingSubscriber ? "Adding…" : "Add"}
            </button>
            {addingSubscriber && (
              <p className="text-xs text-muted-dim w-full mt-1">Adding subscriber and starting automations…</p>
            )}
          </form>
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="btn-ghost inline-flex items-center gap-2"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Bulk import
          </button>
        </div>
      </div>

      {/* Import modal */}
      {showImport && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && closeImportModal()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-modal-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="import-modal-title" className="modal-title">
                Bulk import
              </h2>
              <button
                type="button"
                onClick={closeImportModal}
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
            <form onSubmit={handleImport}>
              <div className="modal-body">
                <p className="mb-3 text-sm text-muted-dim">
                  Paste below or upload a CSV (first column email, optional
                  second column name).
                </p>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface-elevated)] px-4 py-2.5 text-sm font-medium text-muted hover:bg-[var(--surface-hover)] transition-colors">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    Choose file
                    <input
                      type="file"
                      accept=".csv,.txt,text/csv,text/plain"
                      onChange={handleFileSelect}
                      className="sr-only"
                    />
                  </label>
                  <span className="text-xs text-muted">
                    .csv or .txt, UTF-8
                  </span>
                </div>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={"john@example.com, John\njane@example.com"}
                  rows={6}
                  className="input-glass w-full resize-y font-mono text-sm"
                />
                {importText.trim().length > 0 && (
                  <p className="mt-3 text-xs font-medium text-muted">
                    {getImportCount()} contact
                    {getImportCount() !== 1 ? "s" : ""} will be imported
                  </p>
                )}
              </div>
              {importing && (
                <p className="text-sm text-muted-dim px-4 pb-2">Importing subscribers and starting automations…</p>
              )}
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={closeImportModal}
                  className="btn-ghost"
                  disabled={importing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={getImportCount() === 0 || importing}
                >
                  {importing ? "Importing…" : "Import"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List: search + cards + pagination */}
      <section className="section-card subscribers-list-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="section-title mb-0">Your subscribers</h2>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-muted-dim">
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Email or name"
              className="input-glass w-52 sm:w-64 pl-11"
              aria-label="Search by email or name"
            />
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div className="empty-state-centered">
            <div className="empty-state-icon" aria-hidden>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            {list.length === 0 ? (
              <>
                <p className="font-semibold text-foreground">No subscribers yet</p>
                <p className="text-sm text-muted-dim mt-1">Add one above or use bulk import to get started.</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-foreground">No matches</p>
                <p className="text-sm text-muted-dim mt-1">Try a different search term.</p>
                <button type="button" onClick={() => setSearchQuery("")} className="btn-ghost mt-3 text-sm">
                  Clear search
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {paginatedList.map((s) => {
                const isNew = new Date(s.created_at).getTime() >= SEVEN_DAYS_AGO;
                return (
                  <div key={s.id} className="rounded-xl border border-(--card-border) bg-(--surface) p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="list-card-title mb-0 truncate max-w-full" title={s.email}>
                            {s.email}
                          </p>
                          <button
                            type="button"
                            onClick={() => copyEmail(s.email)}
                            className="shrink-0 p-1.5 rounded-lg text-muted-dim hover:text-foreground hover:bg-(--surface-hover) transition-colors"
                            title="Copy email"
                            aria-label="Copy email"
                          >
                            {copiedId === s.email ? (
                              <span className="text-success text-xs">Copied</span>
                            ) : (
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <p className="text-sm text-muted-dim mt-1">{s.name ?? "—"}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`badge text-xs ${s.status === "active" ? "badge-active" : "badge-draft"}`}>
                            {s.status}
                          </span>
                          {isNew && (
                            <span className="inline-block rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-success">
                              New
                            </span>
                          )}
                          <span className="text-xs text-muted-dim tabular-nums">
                            Joined {formatRelative(s.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm({ id: s.id, email: s.email })}
                          className="btn-danger text-sm py-1.5 px-2.5"
                          title="Delete this subscriber"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <nav
              className="dash-pagination mt-4"
              aria-label="Subscriber list pagination"
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
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
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
