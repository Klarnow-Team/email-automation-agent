"use client";

import { useCallback, useEffect, useState } from "react";
import { tagsApi, subscribersApi, type Tag, type Subscriber } from "@/lib/api";
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

export default function TagsPage() {
  const [list, setList] = useState<Tag[]>([]);
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
  const [manageTag, setManageTag] = useState<Tag | null>(null);
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [savingMembers, setSavingMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    tagsApi
      .list()
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (manageTag) {
      subscribersApi.list(0, 500).then(setSubscribers);
      tagsApi.getSubscriberIds(manageTag.id).then((r) => setMemberIds(r.subscriber_ids || []));
    }
  }, [manageTag]);

  const filteredList = list.filter((t) =>
    searchQuery.trim() ? t.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) : true
  );

  const openEdit = (t: Tag) => {
    setEditingId(t.id);
    setName(t.name);
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
      tagsApi
        .update(editingId, { name: trimmedName })
        .then(() => {
          closeForm();
          load();
          setSuccessMessage("Tag updated.");
          setTimeout(() => setSuccessMessage(null), 4000);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to update"))
        .finally(() => setSaving(false));
    } else {
      setCreating(true);
      tagsApi
        .create({ name: trimmedName })
        .then(() => {
          closeForm();
          load();
          setSuccessMessage("Tag created.");
          setTimeout(() => setSuccessMessage(null), 4000);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to create"))
        .finally(() => setCreating(false));
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    const { id, name: tagName } = deleteConfirm;
    setDeletingId(id);
    setError(null);
    tagsApi
      .delete(id)
      .then(() => {
        setDeleteConfirm(null);
        if (manageTag?.id === id) setManageTag(null);
        load();
        setSuccessMessage(`"${tagName}" deleted.`);
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
    if (!manageTag || savingMembers) return;
    setSavingMembers(true);
    tagsApi
      .setSubscribers(manageTag.id, { subscriber_ids: memberIds })
      .then(() => {
        load();
        setSuccessMessage("Subscribers updated.");
        setTimeout(() => setSuccessMessage(null), 3000);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to update subscribers"))
      .finally(() => setSavingMembers(false));
  };

  if (loading && list.length === 0) {
    return (
      <div className="page-root">
        <header className="page-header">
          <div>
            <h1 className="page-title">Tags</h1>
            <p className="page-subtitle">Labels for subscribers</p>
          </div>
        </header>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="spinner" />
          <span className="ml-3 text-sm text-muted-dim">Loading tags…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-root">
      <header className="page-header animate-in">
        <div>
          <h1 className="page-title">Tags</h1>
          <p className="page-subtitle">Labels on subscribers for segments and automations</p>
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
          {showForm ? "Cancel" : "Create tag"}
        </button>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="dash-kpi-card">
          <p className="dash-kpi-value text-foreground">
            <AnimatedCounter value={list.length} />
          </p>
          <p className="dash-kpi-label">Total tags</p>
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
          <h2 className="section-title">{editingId != null ? "Edit tag" : "Create tag"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-glass w-full max-w-md"
                placeholder="e.g. VIP, Product A"
                required
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={creating || saving}>
                {creating ? "Creating…" : saving ? "Saving…" : editingId != null ? "Save changes" : "Create tag"}
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
          aria-labelledby="delete-tag-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="delete-tag-title" className="modal-title">Delete tag</h2>
              <button type="button" onClick={() => setDeleteConfirm(null)} className="modal-close" aria-label="Close">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="text-muted">Delete <strong className="text-foreground">{deleteConfirm.name}</strong>? Subscribers will not be deleted, only this tag will be removed from them.</p>
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

      {manageTag && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setManageTag(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-tag-title"
        >
          <div className="modal-content max-w-xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="manage-tag-title" className="modal-title">Manage: {manageTag.name}</h2>
              <button type="button" onClick={() => setManageTag(null)} className="modal-close" aria-label="Close">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="modal-body overflow-y-auto flex-1">
              <p className="text-sm text-muted mb-3">Select subscribers to have this tag. Changes save when you click Save.</p>
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
              <button type="button" onClick={() => setManageTag(null)} className="btn-ghost">Close</button>
              <button type="button" onClick={saveMembers} className="btn-primary" disabled={savingMembers}>
                {savingMembers ? "Saving…" : "Save subscribers"}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="section-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="section-title mb-0">Your tags</h2>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name"
            className="input-glass w-52 sm:w-64"
            aria-label="Search tags"
          />
        </div>
        {filteredList.length === 0 ? (
          <div className="empty-state-centered">
            <div className="empty-state-icon" aria-hidden>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
            </div>
            <p className="font-semibold text-foreground">No tags yet</p>
            <p className="text-sm text-muted-dim mt-1">Create a tag to label subscribers and use in segments or automations.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredList.map((t) => (
              <div key={t.id} className="rounded-xl border border-(--card-border) bg-(--surface) p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="list-card-title mb-0">{t.name}</p>
                    <p className="text-sm text-muted-dim mt-1">
                      {t.subscriber_count ?? 0} subscriber{(t.subscriber_count ?? 0) !== 1 ? "s" : ""} · Created {formatDate(t.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setManageTag(t)} className="btn-ghost text-sm text-(--accent) hover:bg-[rgba(var(--accent-rgb),0.12)]">
                      Manage subscribers
                    </button>
                    <button type="button" onClick={() => openEdit(t)} className="btn-ghost text-sm">Edit</button>
                    <button type="button" onClick={() => setDeleteConfirm({ id: t.id, name: t.name })} className="btn-danger text-sm py-1.5 px-2.5">Delete</button>
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
