"use client";

import { useCallback, useEffect, useState } from "react";
import { formsApi, groupsApi, automationsApi, type Form, type FormSubmission, type Group, type Automation } from "@/lib/api";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Button, Modal } from "@/components/ui";
import { FormBuilder, type FormBuilderForm } from "./FormBuilder";

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

function embedSnippets(formId: number) {
  const submitUrl = `${base}/api/forms/${formId}/submit`;
  const formOrigin = typeof window !== "undefined" ? window.location.origin : base.replace(/\/api$/, "") || base;
  const formPageUrl = `${formOrigin}/forms/embed/${formId}`;
  return {
    url: submitUrl,
    html: `<!-- Form submit endpoint -->\n<form action="${submitUrl}" method="POST">\n  <input type="email" name="email" required placeholder="Email" />\n  <input type="text" name="name" placeholder="Name" />\n  <button type="submit">Subscribe</button>\n</form>`,
    iframe: `<iframe src="${formPageUrl}" width="100%" height="400" frameborder="0" title="Subscribe form"></iframe>`,
  };
}

export default function FormsPage() {
  const [list, setList] = useState<Form[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [formForBuilder, setFormForBuilder] = useState<Form | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [copyUrlId, setCopyUrlId] = useState<number | null>(null);
  const [embedModal, setEmbedModal] = useState<Form | null>(null);
  const [submissionsModalForm, setSubmissionsModalForm] = useState<Form | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
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

  useEffect(() => {
    if (!submissionsModalForm) {
      setSubmissions([]);
      return;
    }
    setSubmissionsLoading(true);
    formsApi
      .getSubmissions(submissionsModalForm.id)
      .then(setSubmissions)
      .catch(() => setSubmissions([]))
      .finally(() => setSubmissionsLoading(false));
  }, [submissionsModalForm]);

  const filteredList = list.filter((f) =>
    searchQuery.trim() ? f.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) : true
  );

  const openCreate = () => {
    setFormForBuilder(null);
    setShowBuilder(true);
  };

  const openEdit = async (f: Form) => {
    const full = await formsApi.get(f.id);
    setFormForBuilder(full);
    setShowBuilder(true);
  };

  const handleBuilderSave = useCallback(
    async (data: FormBuilderForm) => {
      setError(null);
      const payload = {
        name: data.name,
        form_type: data.form_type,
        fields: data.fields,
        success_message: data.success_message || null,
        redirect_url: data.redirect_url.trim() || null,
        add_to_group_id: data.add_to_group_id,
        trigger_automation_id: data.trigger_automation_id,
      };
      if (formForBuilder) {
        await formsApi.update(formForBuilder.id, payload);
        setSuccessMessage("Form updated.");
      } else {
        await formsApi.create(payload);
        setSuccessMessage("Form created.");
      }
      setShowBuilder(false);
      setFormForBuilder(null);
      load();
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    [formForBuilder, load]
  );

  const handleDuplicate = useCallback(
    async (f: Form) => {
      setDuplicatingId(f.id);
      setError(null);
      try {
        const full = await formsApi.get(f.id);
        await formsApi.create({
          name: `Copy of ${full.name}`,
          form_type: full.form_type,
          fields: full.fields ?? [],
          success_message: full.success_message ?? null,
          redirect_url: full.redirect_url ?? null,
          add_to_group_id: full.add_to_group_id ?? null,
          trigger_automation_id: full.trigger_automation_id ?? null,
        });
        setSuccessMessage("Form duplicated.");
        load();
        setTimeout(() => setSuccessMessage(null), 4000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Duplicate failed");
      } finally {
        setDuplicatingId(null);
      }
    },
    [load]
  );

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
          <p className="page-subtitle">Build subscription forms, collect subscribers, and trigger automations</p>
        </div>
        {!showBuilder && (
          <Button onClick={openCreate}>Create form</Button>
        )}
      </header>

      {showBuilder && (
        <FormBuilder
          form={formForBuilder}
          groups={groups}
          automations={automations}
          onSave={handleBuilderSave}
          onCancel={() => {
            setShowBuilder(false);
            setFormForBuilder(null);
          }}
        />
      )}

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

      {!showBuilder && (
        <>
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
                    <Button variant="ghost" size="sm" onClick={() => openEdit(f)}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => setSubmissionsModalForm(f)}>View submissions</Button>
                    <Button variant="ghost" size="sm" onClick={() => setEmbedModal(f)}>Embed code</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDuplicate(f)} disabled={duplicatingId === f.id}>
                      {duplicatingId === f.id ? "Copying…" : "Duplicate"}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleteConfirm({ id: f.id, name: f.name })}>Delete</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Embed code modal */}
      <Modal
        open={!!embedModal}
        onClose={() => setEmbedModal(null)}
        title="Embed form"
        footer={<Button variant="secondary" size="sm" onClick={() => setEmbedModal(null)}>Close</Button>}
      >
        {embedModal && (() => {
          const { url, html, iframe } = embedSnippets(embedModal.id);
          const copy = (text: string) => {
            navigator.clipboard.writeText(text);
            setCopyUrlId(embedModal.id);
            setTimeout(() => setCopyUrlId(null), 2000);
          };
          return (
            <div className="space-y-4 text-sm">
              <div>
                <p className="mb-1 font-medium text-foreground">Submit URL (POST)</p>
                <div className="flex gap-2">
                  <code className="flex-1 truncate rounded-lg bg-(--card-bg-subtle) px-3 py-2 text-xs">{url}</code>
                  <Button variant="ghost" size="sm" onClick={() => copy(url)}>{copyUrlId === embedModal.id ? "Copied!" : "Copy"}</Button>
                </div>
              </div>
              <div>
                <p className="mb-1 font-medium text-foreground">HTML form</p>
                <pre className="max-h-32 overflow-auto rounded-lg border border-(--card-border) bg-(--card-bg-subtle) p-3 text-xs whitespace-pre-wrap">{html}</pre>
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => copy(html)}>Copy HTML</Button>
              </div>
              <div>
                <p className="mb-1 font-medium text-foreground">iframe</p>
                <pre className="max-h-24 overflow-auto rounded-lg border border-(--card-border) bg-(--card-bg-subtle) p-3 text-xs whitespace-pre-wrap">{iframe}</pre>
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => copy(iframe)}>Copy iframe</Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Submissions modal */}
      <Modal
        open={!!submissionsModalForm}
        onClose={() => setSubmissionsModalForm(null)}
        title={submissionsModalForm ? `Submissions: ${submissionsModalForm.name}` : "Submissions"}
        footer={<Button variant="secondary" size="sm" onClick={() => setSubmissionsModalForm(null)}>Close</Button>}
      >
        {submissionsModalForm && (
          <div className="text-sm">
            {submissionsLoading ? (
              <p className="text-muted">Loading…</p>
            ) : submissions.length === 0 ? (
              <p className="text-muted">No submissions yet.</p>
            ) : (
              <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-(--card-bg) border-b border-(--card-border)">
                    <tr>
                      <th className="text-left py-2 px-2 font-medium text-foreground">Email</th>
                      <th className="text-left py-2 px-2 font-medium text-foreground">Name</th>
                      <th className="text-left py-2 px-2 font-medium text-foreground">Submitted</th>
                      <th className="text-left py-2 px-2 font-medium text-foreground">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((s) => (
                      <tr key={s.id} className="border-b border-(--card-border) last:border-0">
                        <td className="py-2 px-2">{s.email ?? "—"}</td>
                        <td className="py-2 px-2">{s.name ?? "—"}</td>
                        <td className="py-2 px-2 text-muted">{formatDate(s.created_at)}</td>
                        <td className="py-2 px-2">
                          {Object.keys(s.payload).filter((k) => k !== "email" && k !== "name").length > 0 ? (
                            <span className="text-muted" title={JSON.stringify(s.payload)}>
                              {Object.entries(s.payload)
                                .filter(([k]) => k !== "email" && k !== "name")
                                .map(([k, v]) => `${k}: ${String(v)}`)
                                .join(", ")}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
        </>
      )}
    </div>
  );
}
