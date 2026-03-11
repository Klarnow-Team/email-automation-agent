"use client";

import { useCallback, useEffect, useState } from "react";
import { tagsApi, subscribersApi, type Tag, type Subscriber } from "@/lib/api";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Button, Modal } from "@/components/ui";

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
        <Button
          type="button"
          onClick={() => {
            if (showForm) closeForm();
            else {
              setEditingId(null);
              setName("");
              setShowForm(true);
            }
          }}
        >
          {showForm ? "Cancel" : "Create tag"}
        </Button>
      </header>

      <section className="rounded-xl border border-(--card-border) bg-(--card-bg-subtle) p-4 mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-2">How tags work</h2>
        <ul className="text-sm text-muted space-y-1 list-disc list-inside">
          <li><strong className="text-foreground">Labels</strong> — Tags are lightweight labels on subscribers (e.g. &quot;VIP&quot;, &quot;Product A&quot;). A subscriber can have many tags.</li>
          <li><strong className="text-foreground">Create / edit / delete</strong> — Name only. Use Manage subscribers to assign who has each tag.</li>
          <li><strong className="text-foreground">Segments &amp; automations</strong> — Use has_tag / not_has_tag in segments; add_tag / remove_tag in automations and forms.</li>
        </ul>
        <p className="text-xs text-muted-dim mt-3 pt-3 border-t border-(--card-border)">
          Search by name. Deleting a tag removes it from subscribers but does not delete the subscribers.
        </p>
      </section>

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
          <Button variant="ghost" size="sm" type="button" onClick={() => { setError(null); load(); }}>Retry</Button>
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
              <Button type="submit" disabled={creating || saving}>
                {creating ? "Creating…" : saving ? "Saving…" : editingId != null ? "Save changes" : "Create tag"}
              </Button>
              {editingId != null && (
                <Button variant="ghost" type="button" onClick={closeForm}>Cancel</Button>
              )}
            </div>
          </form>
        </div>
      )}

      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete tag"
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
            Delete <strong className="text-[var(--foreground)]">{deleteConfirm.name}</strong>? Subscribers will not be deleted, only this tag will be removed from them.
          </p>
        )}
      </Modal>

      {manageTag && (
        <Modal
          open={true}
          onClose={() => setManageTag(null)}
          title={`Manage: ${manageTag.name}`}
          footer={
            <>
              <Button variant="ghost" onClick={() => setManageTag(null)}>Close</Button>
              <Button onClick={saveMembers} disabled={savingMembers}>
                {savingMembers ? "Saving…" : "Save subscribers"}
              </Button>
            </>
          }
        >
          <p className="text-sm text-[var(--muted)] mb-3">Select subscribers to have this tag. Changes save when you click Save.</p>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {subscribers.map((s) => (
              <label key={s.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--surface-hover)] cursor-pointer">
                <input type="checkbox" checked={memberIds.includes(s.id)} onChange={() => toggleMember(s.id)} className="rounded border-[var(--card-border)]" />
                <span className="text-sm truncate">{s.email}</span>
                {s.name && <span className="text-[var(--muted-dim)] text-xs truncate">({s.name})</span>}
              </label>
            ))}
            {subscribers.length === 0 && <p className="text-sm text-[var(--muted-dim)]">No subscribers yet. Add subscribers from the Subscribers page.</p>}
          </div>
        </Modal>
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
