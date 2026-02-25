"use client";

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

export default function GroupsPage() {
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
      <div className="page-root">
        <header className="page-header">
          <div>
            <h1 className="page-title">Groups</h1>
            <p className="page-subtitle">Organize subscribers into groups</p>
          </div>
        </header>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="spinner" />
          <span className="ml-3 text-sm text-muted-dim">Loading groups…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-root">
      <header className="page-header animate-in">
        <div>
          <h1 className="page-title">Groups</h1>
          <p className="page-subtitle">Organize subscribers into groups for targeting and automations</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (showForm) closeForm();
            else {
              setEditingId(null);
              setName("");
              setShowForm(true);
            }
          }}
          className="btn-primary"
        >
          {showForm ? "Cancel" : "Create group"}
        </button>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
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
        <div className="section-card add-card animate-in">
          <h2 className="section-title">{editingId != null ? "Edit group" : "Create group"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-glass w-full max-w-md"
                placeholder="e.g. Newsletter subscribers"
                required
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={creating || saving}>
                {creating ? "Creating…" : saving ? "Saving…" : editingId != null ? "Save changes" : "Create group"}
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
            <div className="modal-body overflow-y-auto flex-1">
              <p className="text-sm text-muted mb-3">Select subscribers to include in this group. Changes save when you click Save.</p>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {subscribers.map((s) => (
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
                {subscribers.length === 0 && <p className="text-sm text-muted-dim">No subscribers yet. Add subscribers from the Subscribers page.</p>}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setManageGroup(null)} className="btn-ghost">Close</button>
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
                      {g.subscriber_count ?? 0} subscriber{(g.subscriber_count ?? 0) !== 1 ? "s" : ""} · Created {formatDate(g.created_at)}
                    </p>
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
