"use client";

import { useCallback, useEffect, useState } from "react";
import { fieldsApi, type SubscriberField } from "@/lib/api";
import { Button, Dropdown, Modal } from "@/components/ui";

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
] as const;

export function FieldsContent() {
  const [list, setList] = useState<SubscriberField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [fieldType, setFieldType] = useState<string>("text");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; title: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fieldsApi
      .list()
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setTitle("");
    setFieldType("text");
    setShowForm(true);
  };

  const openEdit = (f: SubscriberField) => {
    setEditingId(f.id);
    setTitle(f.title);
    setFieldType(f.field_type);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setTitle("");
    setFieldType("text");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || creating || saving) return;
    setError(null);
    if (editingId != null) {
      setSaving(true);
      fieldsApi
        .update(editingId, { title: trimmedTitle, field_type: fieldType })
        .then(() => {
          closeForm();
          load();
          setSuccessMessage("Field updated.");
          setTimeout(() => setSuccessMessage(null), 4000);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to update"))
        .finally(() => setSaving(false));
    } else {
      setCreating(true);
      fieldsApi
        .create({ title: trimmedTitle, field_type: fieldType })
        .then(() => {
          closeForm();
          load();
          setSuccessMessage("Field created.");
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
    fieldsApi
      .delete(id)
      .then(() => {
        setDeleteConfirm(null);
        load();
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to delete"))
      .finally(() => setDeletingId(null));
  };

  if (loading && list.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="spinner" />
        <span className="ml-3 text-sm text-muted-dim">Loading fields…</span>
      </div>
    );
  }

  return (
    <div className="segments-content subscribers-view-content">
      <div className="subscribers-view-toolbar">
        <Button type="button" onClick={openCreate}>
          Create field
        </Button>
      </div>

      <section className="rounded-xl border border-(--card-border) bg-(--card-bg-subtle) p-4">
        <h2 className="text-sm font-semibold text-foreground mb-2">How custom fields work</h2>
        <ul className="text-sm text-muted space-y-1 list-disc list-inside">
          <li><strong className="text-foreground">Create fields</strong> — Add custom fields (Text, Number, or Date) to collect extra subscriber data (e.g. Company, Job title, Birthday).</li>
          <li><strong className="text-foreground">Use in forms</strong> — Add these fields to signup forms so subscribers can fill them when they join.</li>
          <li><strong className="text-foreground">Segments & personalization</strong> — Segment by custom field values and use {"{$field_key}"} in campaigns to personalize content.</li>
        </ul>
      </section>

      {error && (
        <div className="alert-error animate-in">
          <span>{error}</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setError(null); load(); }}>Retry</Button>
            <button type="button" onClick={() => setError(null)} className="alert-dismiss" aria-label="Dismiss">Dismiss</button>
          </div>
        </div>
      )}
      {successMessage && (
        <div className="alert-success animate-in">
          <span>{successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage(null)} className="alert-dismiss" aria-label="Dismiss">Dismiss</button>
        </div>
      )}

      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete field"
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
          <p className="text-muted">
            Delete <strong className="text-foreground">{deleteConfirm.title}</strong>? Subscriber data for this field will remain in their records but the field definition will be removed.
          </p>
        )}
      </Modal>

      {showForm && (
        <div className="section-card add-card animate-in">
          <h2 className="section-title">{editingId != null ? "Edit field" : "Create field"}</h2>
          <p className="text-sm text-muted-dim mb-4">
            {editingId != null
              ? "Update the field name or type. The key used in segments and personalization stays the same."
              : "Enter a field name and type. The key is generated from the name (e.g. &quot;Job title&quot; → job_title)."}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label">Field name</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-glass w-full max-w-md"
                placeholder="e.g. Company, Job title, Birthday"
                required
              />
            </div>
            <div>
              <label className="field-label">Field type</label>
              <select
                value={fieldType}
                onChange={(e) => setFieldType(e.target.value)}
                className="input-glass text-sm min-w-[120px]"
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={creating || saving}>
                {editingId != null ? (saving ? "Saving…" : "Save changes") : (creating ? "Creating…" : "Create")}
              </Button>
              <Button type="button" variant="ghost" onClick={closeForm}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      <section className="section-card">
        <h2 className="section-title mb-4">Your fields</h2>
        {list.length === 0 ? (
          <div className="empty-state-centered">
            <div className="empty-state-icon" aria-hidden>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.581a1 1 0 01.994.89L15 13v2a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="font-semibold text-foreground">No custom fields yet</p>
            <p className="text-sm text-muted-dim mt-1">Create a field to collect extra subscriber data and use it in segments and campaigns.</p>
            <Button type="button" onClick={openCreate} className="mt-3">Create field</Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-(--card-border) bg-(--surface)">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-(--card-border) bg-(--surface-elevated)">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-dim">Field name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-dim">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-dim">Subscribers</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-dim">Key (for segments)</th>
                  <th className="w-10 px-4 py-3" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {list.map((f) => (
                  <tr key={f.id} className="border-b border-(--card-border) last:border-b-0 hover:bg-(--surface-hover)">
                    <td className="px-4 py-3 font-medium text-foreground">{f.title}</td>
                    <td className="px-4 py-3 text-muted capitalize">{f.field_type}</td>
                    <td className="px-4 py-3 tabular-nums text-muted">{f.subscriber_count ?? 0}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-dim">{f.key}</td>
                    <td className="px-4 py-3">
                      <Dropdown
                        align="right"
                        trigger={
                          <button
                            type="button"
                            className="flex items-center justify-center w-9 h-9 rounded-lg text-muted hover:text-foreground hover:bg-(--surface-hover) transition-colors"
                            aria-label="More options"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                              <circle cx="12" cy="6" r="1.5" />
                              <circle cx="12" cy="12" r="1.5" />
                              <circle cx="12" cy="18" r="1.5" />
                            </svg>
                          </button>
                        }
                      >
                        <button
                          type="button"
                          onClick={() => openEdit(f)}
                          className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-(--surface-hover)"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm({ id: f.id, title: f.title })}
                          className="w-full text-left px-3 py-2 text-sm text-danger hover:bg-(--danger-muted)"
                        >
                          Delete
                        </button>
                      </Dropdown>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default function FieldsPage() {
  return <FieldsContent />;
}
