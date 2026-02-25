"use client";

import { useCallback, useEffect, useState } from "react";
import { formsApi, groupsApi, automationsApi, type Form, type Group, type Automation } from "@/lib/api";
import { AnimatedCounter } from "@/components/AnimatedCounter";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const base = API_BASE.replace(/\/$/, "") || "";

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

export default function FormsPage() {
  const [list, setList] = useState<Form[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [formType, setFormType] = useState("embed");
  const [successMessageField, setSuccessMessageField] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [addToGroupId, setAddToGroupId] = useState<number | null>(null);
  const [triggerAutomationId, setTriggerAutomationId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [copyUrlId, setCopyUrlId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([formsApi.list(), groupsApi.list(), automationsApi.list(0, 200)])
      .then(([forms, grps, autos]) => {
        setList(forms);
        setGroups(grps);
        setAutomations(autos);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredList = list.filter((f) =>
    searchQuery.trim() ? f.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) : true
  );

  const openEdit = (f: Form) => {
    setEditingId(f.id);
    setName(f.name);
    setFormType(f.form_type || "embed");
    setSuccessMessageField(f.success_message || "");
    setRedirectUrl(f.redirect_url || "");
    setAddToGroupId(f.add_to_group_id ?? null);
    setTriggerAutomationId(f.trigger_automation_id ?? null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setFormType("embed");
    setSuccessMessageField("");
    setRedirectUrl("");
    setAddToGroupId(null);
    setTriggerAutomationId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || creating || saving) return;
    setError(null);
    const payload = {
      name: trimmedName,
      form_type: formType,
      success_message: successMessageField || null,
      redirect_url: redirectUrl.trim() || null,
      add_to_group_id: addToGroupId,
      trigger_automation_id: triggerAutomationId,
    };
    if (editingId != null) {
      setSaving(true);
      formsApi
        .update(editingId, payload)
        .then(() => {
          closeForm();
          load();
          setSuccessMessage("Form updated.");
          setTimeout(() => setSuccessMessage(null), 4000);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to update"))
        .finally(() => setSaving(false));
    } else {
      setCreating(true);
      formsApi
        .create(payload)
        .then(() => {
          closeForm();
          load();
          setSuccessMessage("Form created. Use the submit URL to collect signups.");
          setTimeout(() => setSuccessMessage(null), 5000);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to create"))
        .finally(() => setCreating(false));
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    const { id, name: formName } = deleteConfirm;
    setDeletingId(id);
    setError(null);
    formsApi
      .delete(id)
      .then(() => {
        setDeleteConfirm(null);
        load();
        setSuccessMessage(`"${formName}" deleted.`);
        setTimeout(() => setSuccessMessage(null), 4000);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to delete"))
      .finally(() => setDeletingId(null));
  };

  const submitUrl = (formId: number) => `${base}/api/forms/${formId}/submit`;

  const copySubmitUrl = (formId: number) => {
    const url = submitUrl(formId);
    navigator.clipboard.writeText(url).then(() => {
      setCopyUrlId(formId);
      setTimeout(() => setCopyUrlId(null), 2000);
    });
  };

  if (loading && list.length === 0) {
    return (
      <div className="page-root">
        <header className="page-header">
          <div>
            <h1 className="page-title">Forms</h1>
            <p className="page-subtitle">Collect signups with embeddable forms</p>
          </div>
        </header>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="spinner" />
          <span className="ml-3 text-sm text-muted-dim">Loading forms…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-root">
      <header className="page-header animate-in">
        <div>
          <h1 className="page-title">Forms</h1>
          <p className="page-subtitle">Create forms to collect subscribers; use the submit URL in your site or app</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (showForm) closeForm();
            else {
              setEditingId(null);
              setName("");
              setFormType("embed");
              setSuccessMessageField("");
              setRedirectUrl("");
              setAddToGroupId(null);
              setTriggerAutomationId(null);
              setShowForm(true);
            }
          }}
          className="btn-primary"
        >
          {showForm ? "Cancel" : "Create form"}
        </button>
      </header>

      <section className="rounded-xl border border-(--card-border) bg-(--card-bg-subtle) p-4 mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-2">How forms work</h2>
        <ul className="text-sm text-muted space-y-1 list-disc list-inside">
          <li>Create a form and get a <strong className="text-foreground">submit URL</strong>. POST <code className="text-xs bg-(--surface) px-1 rounded">email</code>, optional <code className="text-xs bg-(--surface) px-1 rounded">name</code> and <code className="text-xs bg-(--surface) px-1 rounded">data</code> to add or update subscribers.</li>
          <li>Optionally add new signups to a <strong className="text-foreground">group</strong> or trigger an <strong className="text-foreground">automation</strong>.</li>
          <li>Set a success message or redirect URL after submission.</li>
        </ul>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="dash-kpi-card">
          <p className="dash-kpi-value text-foreground">
            <AnimatedCounter value={list.length} />
          </p>
          <p className="dash-kpi-label">Total forms</p>
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
          <h2 className="section-title">{editingId != null ? "Edit form" : "Create form"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-glass w-full max-w-md"
                placeholder="e.g. Newsletter signup"
                required
              />
            </div>
            <div>
              <label className="field-label">Form type</label>
              <select value={formType} onChange={(e) => setFormType(e.target.value)} className="input-glass select-glass max-w-xs">
                <option value="embed">Embed</option>
                <option value="popup">Popup</option>
                <option value="slide_in">Slide-in</option>
                <option value="landing">Landing</option>
              </select>
            </div>
            <div>
              <label className="field-label">Success message (optional)</label>
              <input
                type="text"
                value={successMessageField}
                onChange={(e) => setSuccessMessageField(e.target.value)}
                className="input-glass w-full max-w-md"
                placeholder="e.g. Thank you for subscribing!"
              />
            </div>
            <div>
              <label className="field-label">Redirect URL after submit (optional)</label>
              <input
                type="url"
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                className="input-glass w-full max-w-md"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="field-label">Add to group (optional)</label>
              <select
                value={addToGroupId ?? ""}
                onChange={(e) => setAddToGroupId(e.target.value === "" ? null : Number(e.target.value))}
                className="input-glass select-glass max-w-xs"
              >
                <option value="">— None —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Trigger automation (optional)</label>
              <select
                value={triggerAutomationId ?? ""}
                onChange={(e) => setTriggerAutomationId(e.target.value === "" ? null : Number(e.target.value))}
                className="input-glass select-glass max-w-xs"
              >
                <option value="">— None —</option>
                {automations.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={creating || saving}>
                {creating ? "Creating…" : saving ? "Saving…" : editingId != null ? "Save changes" : "Create form"}
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
          aria-labelledby="delete-form-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="delete-form-title" className="modal-title">Delete form</h2>
              <button type="button" onClick={() => setDeleteConfirm(null)} className="modal-close" aria-label="Close">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="text-muted">Delete <strong className="text-foreground">{deleteConfirm.name}</strong>? Submissions will be lost.</p>
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
          <h2 className="section-title mb-0">Your forms</h2>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name"
            className="input-glass w-52 sm:w-64"
            aria-label="Search forms"
          />
        </div>
        {filteredList.length === 0 ? (
          <div className="empty-state-centered">
            <div className="empty-state-icon" aria-hidden>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <p className="font-semibold text-foreground">No forms yet</p>
            <p className="text-sm text-muted-dim mt-1">Create a form to get a submit URL for your website or app.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredList.map((f) => (
              <div key={f.id} className="rounded-xl border border-(--card-border) bg-(--surface) p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="list-card-title mb-0">{f.name}</p>
                    <p className="text-sm text-muted-dim mt-1">
                      {f.submission_count ?? 0} submission{(f.submission_count ?? 0) !== 1 ? "s" : ""} · {f.form_type} · Created {formatDate(f.created_at)}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <code className="text-xs bg-(--surface-elevated) px-2 py-1 rounded truncate max-w-full block">
                        POST {submitUrl(f.id)}
                      </code>
                      <button
                        type="button"
                        onClick={() => copySubmitUrl(f.id)}
                        className="btn-ghost text-xs py-1"
                      >
                        {copyUrlId === f.id ? "Copied!" : "Copy URL"}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button type="button" onClick={() => openEdit(f)} className="btn-ghost text-sm text-(--accent) hover:bg-[rgba(var(--accent-rgb),0.12)]">Edit</button>
                    <button type="button" onClick={() => setDeleteConfirm({ id: f.id, name: f.name })} className="btn-danger text-sm py-1.5 px-2.5">Delete</button>
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
