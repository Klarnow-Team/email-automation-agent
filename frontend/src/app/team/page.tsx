"use client";

import { useCallback, useEffect, useState } from "react";
import { teamMembersApi, type TeamMember } from "@/lib/api";
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

export default function TeamPage() {
  const [list, setList] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    teamMembersApi
      .list()
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredList = list.filter((m) =>
    searchQuery.trim()
      ? m.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      : true
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || creating) return;
    setError(null);
    setCreating(true);
    teamMembersApi
      .create({ name: trimmedName })
      .then(() => {
        setName("");
        setShowForm(false);
        load();
        setSuccessMessage("Team member added.");
        setTimeout(() => setSuccessMessage(null), 4000);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to add"))
      .finally(() => setCreating(false));
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    const { id, name: memberName } = deleteConfirm;
    setDeletingId(id);
    setError(null);
    teamMembersApi
      .delete(id)
      .then(() => {
        setDeleteConfirm(null);
        load();
        setSuccessMessage(`"${memberName}" removed.`);
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
            <h1 className="page-title">Team members</h1>
            <p className="page-subtitle">People who can receive bookings</p>
          </div>
        </header>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="spinner" />
          <span className="ml-3 text-sm text-muted-dim">Loading team…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-root">
      <header className="page-header animate-in">
        <div>
          <h1 className="page-title">Team members</h1>
          <p className="page-subtitle">Manage people who can receive bookings for event types</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm((v) => !v);
            if (showForm) {
              setName("");
              setError(null);
            }
          }}
          className="btn-primary"
        >
          {showForm ? "Cancel" : "Add member"}
        </button>
      </header>

      <section className="rounded-xl border border-(--card-border) bg-(--card-bg-subtle) p-4 mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-2">How team members work</h2>
        <ul className="text-sm text-muted space-y-1 list-disc list-inside">
          <li><strong className="text-foreground">Assign to event types</strong> — In each event type, add team members. Invitees can book with any of them (round-robin or pool).</li>
          <li><strong className="text-foreground">Vacation blocks</strong> — Add time-off per member in event type settings or availability. Their slots are excluded during those dates.</li>
          <li><strong className="text-foreground">Booking profile</strong> — Team members use the shared booking profile for the public booking page.</li>
        </ul>
        <p className="text-xs text-muted-dim mt-3 pt-3 border-t border-(--card-border)">
          Add a team member here, then assign them to event types in Bookings → Event types → Edit → Team.
        </p>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="dash-kpi-card">
          <p className="dash-kpi-value text-foreground">
            <AnimatedCounter value={list.length} />
          </p>
          <p className="dash-kpi-label">Team members</p>
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
          <h2 className="section-title">Add team member</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-glass w-full max-w-md"
                placeholder="e.g. Jane Smith"
                required
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={creating}>
                {creating ? "Adding…" : "Add member"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setName(""); }} className="btn-ghost">Cancel</button>
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
          aria-labelledby="delete-team-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="delete-team-title" className="modal-title">Remove team member</h2>
              <button type="button" onClick={() => setDeleteConfirm(null)} className="modal-close" aria-label="Close">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="text-muted">
                Remove <strong className="text-foreground">{deleteConfirm.name}</strong>? They will be removed from any event types. Past bookings are not affected.
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
          <h2 className="section-title mb-0">Your team</h2>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name"
            className="input-glass w-52 sm:w-64"
            aria-label="Search team members"
          />
        </div>
        {filteredList.length === 0 ? (
          <div className="empty-state-centered">
            <div className="empty-state-icon" aria-hidden>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <p className="font-semibold text-foreground">No team members yet</p>
            <p className="text-sm text-muted-dim mt-1">Add team members to assign them to event types for round-robin or pool booking.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredList.map((m) => (
              <div key={m.id} className="rounded-xl border border-(--card-border) bg-(--surface) p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="list-card-title mb-0">{m.name}</p>
                    <p className="text-sm text-muted-dim mt-1">
                      Added {formatDate(m.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a href="/bookings" className="btn-ghost text-sm text-(--accent) hover:bg-[rgba(var(--accent-rgb),0.12)]">
                      View in Bookings
                    </a>
                    <button type="button" onClick={() => setDeleteConfirm({ id: m.id, name: m.name })} className="btn-danger text-sm py-1.5 px-2.5">Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
