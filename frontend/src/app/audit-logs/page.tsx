"use client";

import { useCallback, useEffect, useState } from "react";
import { auditApi, type AuditLogEntry } from "@/lib/api";

const PAGE_SIZE = 20;
const RESOURCE_TYPES = ["event_type", "booking"];
const ACTIONS = ["event_type.create", "event_type.update", "event_type.delete", "booking.create", "booking.update", "booking.delete"];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
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

export default function AuditLogsPage() {
  const [list, setList] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [resourceType, setResourceType] = useState<string>("");
  const [action, setAction] = useState<string>("");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    auditApi
      .list(
        page * PAGE_SIZE,
        PAGE_SIZE,
        resourceType || undefined,
        action || undefined
      )
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [page, resourceType, action]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page-root">
      <header className="page-header animate-in">
        <div>
          <h1 className="page-title">Audit logs</h1>
          <p className="page-subtitle">Track actions across subscribers, campaigns, bookings, and more</p>
        </div>
      </header>

      <section className="rounded-xl border border-(--card-border) bg-(--card-bg-subtle) p-4 mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-2">How audit logs work</h2>
        <ul className="text-sm text-muted space-y-1 list-disc list-inside">
          <li><strong className="text-foreground">Read-only</strong> — Logs record create, update, delete, and other actions with timestamps and optional details.</li>
          <li><strong className="text-foreground">Filter</strong> — Filter by resource type (subscriber, campaign, booking, etc.) or action.</li>
          <li><strong className="text-foreground">Use cases</strong> — Debugging, compliance, and understanding who did what and when.</li>
        </ul>
        <p className="text-xs text-muted-dim mt-3 pt-3 border-t border-(--card-border)">
          Entries are ordered newest first. Paginate to browse older logs.
        </p>
      </section>

      {error && (
        <div className="alert-error animate-in">
          <span>{error}</span>
          <button type="button" onClick={() => load()} className="btn-ghost text-sm">Retry</button>
          <button type="button" onClick={() => setError(null)} className="alert-dismiss" aria-label="Dismiss">Dismiss</button>
        </div>
      )}

      <section className="section-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="section-title mb-0">Recent activity</h2>
          <div className="flex flex-wrap gap-2">
            <select
              value={resourceType}
              onChange={(e) => {
                setResourceType(e.target.value);
                setPage(0);
              }}
              className="input-glass select-glass"
              aria-label="Filter by resource type"
            >
              <option value="">All types</option>
              {RESOURCE_TYPES.map((rt) => (
                <option key={rt} value={rt}>{rt}</option>
              ))}
            </select>
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(0);
              }}
              className="input-glass select-glass"
              aria-label="Filter by action"
            >
              <option value="">All actions</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && list.length === 0 ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="spinner" />
            <span className="ml-3 text-sm text-muted-dim">Loading logs…</span>
          </div>
        ) : list.length === 0 ? (
          <div className="empty-state-centered">
            <div className="empty-state-icon" aria-hidden>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <p className="font-semibold text-foreground">No audit logs</p>
            <p className="text-sm text-muted-dim mt-1">Logs appear here as you create, update, or delete resources.</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {list.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-(--card-border) bg-(--surface) p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="badge badge-draft text-xs mr-2">{entry.resource_type}</span>
                      <span className="badge badge-sent text-xs">{entry.action}</span>
                      {entry.resource_id && (
                        <span className="text-muted-dim text-sm ml-2">#{entry.resource_id}</span>
                      )}
                      {entry.details && Object.keys(entry.details).length > 0 && (
                        <pre className="text-xs text-muted mt-2 overflow-x-auto">
                          {JSON.stringify(entry.details)}
                        </pre>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-dim">
                      {formatDate(entry.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-(--card-border)">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
                className="btn-ghost text-sm"
              >
                Previous
              </button>
              <span className="text-sm text-muted-dim">Page {page + 1}</span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={list.length < PAGE_SIZE || loading}
                className="btn-ghost text-sm"
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
