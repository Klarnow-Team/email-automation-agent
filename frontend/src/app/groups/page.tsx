"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { groupsApi, subscribersApi, type Group, type Subscriber } from "@/lib/api";
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

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function EntityStatRow({
  subscriberCount,
  openRate,
  clickRate,
}: {
  subscriberCount: number;
  openRate: number | null | undefined;
  clickRate: number | null | undefined;
}) {
  return (
    <div className="entity-stat-row">
      <div className="entity-stat-item icon-subscribers" title="Subscribers in this group">
        <span className="entity-stat-item-icon" aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </span>
        <span>
          <span className="entity-stat-item-label">Subscribers</span>{" "}
          <span className="entity-stat-item-value">{formatNumber(subscriberCount)}</span>
        </span>
      </div>
      <div className="entity-stat-item icon-open" title="Open rate (opens / emails sent)">
        <span className="entity-stat-item-icon" aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </span>
        <span>
          <span className="entity-stat-item-label">Open</span>{" "}
          <span className="entity-stat-item-value">{openRate != null ? `${openRate}%` : "—"}</span>
        </span>
      </div>
      <div className="entity-stat-item icon-click" title="Click rate (clicks / emails sent)">
        <span className="entity-stat-item-icon" aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4l7.07 17 2.51-7.39L21 11.07z" />
          </svg>
        </span>
        <span>
          <span className="entity-stat-item-label">Click</span>{" "}
          <span className="entity-stat-item-value">{clickRate != null ? `${clickRate}%` : "—"}</span>
        </span>
      </div>
    </div>
  );
}

export function GroupsContent() {
  const [list, setList] = useState<Group[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [manageGroup, setManageGroup] = useState<Group | null>(null);
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [savingMembers, setSavingMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [memberEmailInput, setMemberEmailInput] = useState("");
  const [memberListFilter, setMemberListFilter] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    groupsApi
      .list()
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (manageGroup) {
      setMemberEmailInput("");
      setMemberListFilter("");
      subscribersApi.list(0, 500).then(setSubscribers);
      groupsApi.getSubscriberIds(manageGroup.id).then((r) => setMemberIds(r.subscriber_ids || []));
    }
  }, [manageGroup]);

  const filteredList = list.filter((g) =>
    searchQuery.trim() ? g.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) : true
  );

  const openEdit = (g: Group) => {
    setEditingId(g.id);
    setName(g.name);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || creating || saving) return;
    setError(null);
    if (editingId != null) {
      setSaving(true);
      groupsApi
        .update(editingId, { name: trimmedName })
        .then(() => {
          closeForm();
          load();
          setSuccessMessage("Group updated.");
          setTimeout(() => setSuccessMessage(null), 4000);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to update"))
        .finally(() => setSaving(false));
    } else {
      setCreating(true);
      groupsApi
        .create({ name: trimmedName })
        .then(() => {
          closeForm();
          load();
          setSuccessMessage("Group created.");
          setTimeout(() => setSuccessMessage(null), 4000);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to create"))
        .finally(() => setCreating(false));
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    const { id, name: groupName } = deleteConfirm;
    setDeletingId(id);
    setError(null);
    groupsApi
      .delete(id)
      .then(() => {
        setDeleteConfirm(null);
        if (manageGroup?.id === id) setManageGroup(null);
        load();
        setSuccessMessage(`"${groupName}" deleted.`);
        setTimeout(() => setSuccessMessage(null), 4000);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to delete"))
      .finally(() => setDeletingId(null));
  };

  const toggleMember = (subId: number) => {
    setMemberIds((prev) =>
      prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId]
    );
  };

  const selectAllMembers = () => setMemberIds(subscribers.map((s) => s.id));
  const deselectAllMembers = () => setMemberIds([]);

  const filteredSubscribers = memberListFilter.trim()
    ? subscribers.filter(
        (s) =>
          s.email.toLowerCase().includes(memberListFilter.trim().toLowerCase()) ||
          (s.name?.toLowerCase().includes(memberListFilter.trim().toLowerCase()) ?? false)
      )
    : subscribers;

  const addMembersByEmail = () => {
    if (!manageGroup || savingMembers) return;
    const raw = memberEmailInput.trim();
    if (!raw) return;
    const emails = raw
      .split(/[\n,]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const seen = new Set<string>();
    const uniqueEmails = emails.filter((e) => {
      if (seen.has(e)) return false;
      seen.add(e);
      return true;
    });
    const emailToSub = new Map(subscribers.map((s) => [s.email.toLowerCase(), s]));
    const idsToAdd = uniqueEmails.map((e) => emailToSub.get(e)?.id).filter((id): id is number => id != null);
    const notFound = uniqueEmails.filter((e) => !emailToSub.has(e));
    if (idsToAdd.length === 0) {
      setError(notFound.length > 0 ? `None of the entered emails were found in the subscriber list (${subscribers.length} loaded).` : "No valid emails to add.");
      return;
    }
    setSavingMembers(true);
    setError(null);
    groupsApi
      .addSubscribers(manageGroup.id, { subscriber_ids: idsToAdd })
      .then((r) => {
        groupsApi.getSubscriberIds(manageGroup.id).then((res) => setMemberIds(res.subscriber_ids || []));
        load();
        setMemberEmailInput("");
        const msg =
          notFound.length > 0
            ? `Added ${r.added_count} to group. ${notFound.length} email(s) not found in list.`
            : r.added_count > 0
              ? `Added ${r.added_count} subscriber${r.added_count !== 1 ? "s" : ""} to group.`
              : "All entered subscribers were already in the group.";
        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(null), 4000);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to add subscribers"))
      .finally(() => setSavingMembers(false));
  };

  const saveMembers = () => {
    if (!manageGroup || savingMembers) return;
    setSavingMembers(true);
    groupsApi
      .setSubscribers(manageGroup.id, { subscriber_ids: memberIds })
      .then(() => {
        load();
        setSuccessMessage("Members updated.");
        setTimeout(() => setSuccessMessage(null), 3000);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to update members"))
      .finally(() => setSavingMembers(false));
  };

  if (loading && list.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="spinner" />
        <span className="ml-3 text-sm text-muted-dim">Loading groups…</span>
      </div>
    );
  }

  return (
    <div className="groups-content subscribers-view-content">
      <div className="subscribers-view-toolbar">
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setName("");
            setShowForm(true);
          }}
          className="btn-primary"
        >
          Create group
        </button>
      </div>

      <section className="rounded-xl border border-(--card-border) bg-(--card-bg-subtle) p-4">
        <h2 className="text-sm font-semibold text-foreground mb-2">How groups work</h2>
        <ul className="text-sm text-muted space-y-1 list-disc list-inside">
          <li><strong className="text-foreground">Organize</strong> — Groups let you organize subscribers into named sets (e.g. &quot;Newsletter subscribers&quot;, &quot;Product A buyers&quot;).</li>
          <li><strong className="text-foreground">Create / edit / delete</strong> — Name only. Use Manage members to assign subscribers to each group.</li>
          <li><strong className="text-foreground">Segments &amp; automations</strong> — Use in_group / not_in_group in segments; group_joined / group_left triggers in automations.</li>
        </ul>
        <p className="text-xs text-muted-dim mt-3 pt-3 border-t border-(--card-border)">
          Search by name. Deleting a group removes memberships but does not delete the subscribers.
        </p>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="dash-kpi-card">
          <p className="dash-kpi-value text-foreground">
            <AnimatedCounter value={list.length} />
          </p>
          <p className="dash-kpi-label">Total groups</p>
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
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && closeForm()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="group-form-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="group-form-title" className="modal-title">
                {editingId != null ? "Edit group" : "Create group"}
              </h2>
              <button type="button" onClick={closeForm} className="modal-close" aria-label="Close">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} id="group-form">
              <div className="modal-body space-y-4">
                <div>
                  <label htmlFor="group-name" className="field-label">Group name</label>
                  <input
                    id="group-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-glass w-full"
                    placeholder="e.g. Newsletter subscribers"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={closeForm} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary" disabled={creating || saving}>
                  {creating ? "Creating…" : saving ? "Saving…" : editingId != null ? "Save changes" : "Create group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-group-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="delete-group-title" className="modal-title">Delete group</h2>
              <button type="button" onClick={() => setDeleteConfirm(null)} className="modal-close" aria-label="Close">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="text-muted">Delete <strong className="text-foreground">{deleteConfirm.name}</strong>? Subscribers will not be deleted, only their membership.</p>
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

      {manageGroup && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setManageGroup(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-group-title"
        >
          <div className="modal-content max-w-xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="manage-group-title" className="modal-title">Manage: {manageGroup.name}</h2>
              <button type="button" onClick={() => setManageGroup(null)} className="modal-close" aria-label="Close">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="modal-body overflow-y-auto flex-1 space-y-4">
              <section className="rounded-lg border border-(--card-border) bg-(--card-bg-subtle) p-3">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Add members by email</h3>
                <p className="text-sm text-muted mb-2">Paste emails (one per line or comma-separated) to add those subscribers to this group.</p>
                <textarea
                  value={memberEmailInput}
                  onChange={(e) => setMemberEmailInput(e.target.value)}
                  placeholder="e.g. one@example.com, two@example.com"
                  className="input-glass w-full min-h-[80px] resize-y text-sm"
                  rows={3}
                />
                <button
                  type="button"
                  onClick={addMembersByEmail}
                  disabled={savingMembers || !memberEmailInput.trim()}
                  className="mt-2 btn-primary text-sm"
                >
                  {savingMembers ? "Adding…" : "Add these to group"}
                </button>
              </section>

              <section>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Select subscribers</h3>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={selectAllMembers} className="text-xs btn-ghost py-1 px-2 text-(--accent)">
                      Select all
                    </button>
                    <button type="button" onClick={deselectAllMembers} className="text-xs btn-ghost py-1 px-2 text-muted hover:text-foreground">
                      Deselect all
                    </button>
                  </div>
                </div>
                <input
                  type="search"
                  value={memberListFilter}
                  onChange={(e) => setMemberListFilter(e.target.value)}
                  placeholder="Filter by email or name…"
                  className="input-glass w-full mb-2 text-sm"
                  aria-label="Filter subscribers"
                />
                <p className="text-sm text-muted mb-2">
                  Use <strong className="text-foreground">Add selected to group</strong> to add the selected subscribers without removing existing members; use <strong className="text-foreground">Save members</strong> to replace the group with your current selection.
                </p>
                <div className="space-y-1 max-h-64 overflow-y-auto border border-(--card-border) rounded-lg p-2">
                  {filteredSubscribers.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-(--surface-hover) cursor-pointer">
                      <input
                        type="checkbox"
                        checked={memberIds.includes(s.id)}
                        onChange={() => toggleMember(s.id)}
                        className="rounded border-(--card-border)"
                      />
                      <span className="text-sm truncate">{s.email}</span>
                      {s.name && <span className="text-muted-dim text-xs truncate">({s.name})</span>}
                    </label>
                  ))}
                  {filteredSubscribers.length === 0 && (
                    <p className="text-sm text-muted-dim p-2">
                      {subscribers.length === 0 ? "No subscribers yet. Add subscribers from the Subscribers page." : "No subscribers match the filter."}
                    </p>
                  )}
                </div>
                {subscribers.length > 0 && (
                  <p className="text-xs text-muted-dim mt-2">
                    {memberIds.length} of {subscribers.length} selected
                  </p>
                )}
              </section>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setManageGroup(null)} className="btn-ghost">Close</button>
              <button
                type="button"
                onClick={() => {
                  if (!manageGroup || savingMembers || memberIds.length === 0) return;
                  setSavingMembers(true);
                  groupsApi
                    .addSubscribers(manageGroup.id, { subscriber_ids: memberIds })
                    .then((r) => {
                      groupsApi.getSubscriberIds(manageGroup.id).then((res) => setMemberIds(res.subscriber_ids || []));
                      load();
                      const msg = r.added_count > 0
                        ? `Added ${r.added_count} subscriber${r.added_count !== 1 ? "s" : ""} to group.`
                        : "All selected subscribers were already in the group.";
                      setSuccessMessage(msg);
                      setTimeout(() => setSuccessMessage(null), 4000);
                    })
                    .catch((e) => setError(e instanceof Error ? e.message : "Failed to add subscribers"))
                    .finally(() => setSavingMembers(false));
                }}
                className="btn-ghost border border-(--card-border) hover:bg-(--surface-hover)"
                disabled={savingMembers || memberIds.length === 0}
              >
                {savingMembers ? "Adding…" : "Add selected to group"}
              </button>
              <button type="button" onClick={saveMembers} className="btn-primary" disabled={savingMembers}>
                {savingMembers ? "Saving…" : "Save members"}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="section-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="section-title mb-0">Your groups</h2>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name"
            className="input-glass w-52 sm:w-64"
            aria-label="Search groups"
          />
        </div>
        {filteredList.length === 0 ? (
          <div className="empty-state-centered">
            <div className="empty-state-icon" aria-hidden>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <p className="font-semibold text-foreground">No groups yet</p>
            <p className="text-sm text-muted-dim mt-1">Create a group to organize subscribers and use in segments or automations.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredList.map((g) => (
              <div key={g.id} className="rounded-xl border border-(--card-border) bg-(--surface) p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="list-card-title mb-0">{g.name}</p>
                    <p className="text-sm text-muted-dim mt-1">
                      Created {formatDate(g.created_at)}
                    </p>
                    <EntityStatRow
                      subscriberCount={g.subscriber_count ?? 0}
                      openRate={g.open_rate}
                      clickRate={g.click_rate}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setManageGroup(g)} className="btn-ghost text-sm text-(--accent) hover:bg-[rgba(var(--accent-rgb),0.12)]">
                      Manage members
                    </button>
                    <button type="button" onClick={() => openEdit(g)} className="btn-ghost text-sm">Edit</button>
                    <button type="button" onClick={() => setDeleteConfirm({ id: g.id, name: g.name })} className="btn-danger text-sm py-1.5 px-2.5">Delete</button>
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

export default function GroupsPage() {
  return (
    <>
      <p className="text-sm text-muted mb-2">
        <Link href="/subscribers" className="text-(--accent) hover:underline">Subscribers</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Groups</span>
      </p>
      <GroupsContent />
    </>
  );
}
