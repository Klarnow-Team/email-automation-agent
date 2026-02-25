"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  automationsApi,
  subscribersApi,
  type Automation,
  type AutomationStep,
  type Subscriber,
} from "@/lib/api";
import { AnimatedCounter } from "@/components/AnimatedCounter";

type StatusFilter = "all" | "active" | "paused";

function formatDate(iso: string | null): string {
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

function stepSummary(step: { step_type: string; payload?: Record<string, unknown> | null }): string {
  if (step.step_type === "email") {
    const sub = (step.payload?.subject as string) || "Email";
    return sub.slice(0, 24) + (sub.length > 24 ? "…" : "");
  }
  if (step.step_type === "delay") {
    const min = (step.payload?.delay_minutes as number) ?? 0;
    return `${min}m`;
  }
  return step.step_type;
}

function flowPreview(steps: { order: number; step_type: string; payload?: Record<string, unknown> | null }[]): string {
  if (!steps.length) return "No steps";
  return [...steps]
    .sort((a, b) => a.order - b.order)
    .map(stepSummary)
    .join(" → ");
}

function FlowPills({ steps }: { steps: AutomationStep[] }) {
  const sorted = useMemo(() => [...steps].sort((a, b) => a.order - b.order), [steps]);
  if (!sorted.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      {sorted.map((step, i) => (
        <span key={step.id ?? i}>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
              step.step_type === "email"
                ? "bg-(--surface-elevated) text-foreground border border-(--card-border)"
                : "bg-(--card-bg-subtle) text-muted border border-(--card-border)"
            }`}
            title={step.step_type === "email" ? (step.payload?.subject as string) || "Email" : `Wait ${step.payload?.delay_minutes ?? 0} min`}
          >
            {step.step_type === "email" ? "✉ " : "⏱ "}
            {stepSummary(step)}
          </span>
          {i < sorted.length - 1 && (
            <span className="text-muted-dim mx-0.5 text-xs" aria-hidden>→</span>
          )}
        </span>
      ))}
    </div>
  );
}

export default function AutomationsPage() {
  const [list, setList] = useState<Automation[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("subscriber_added");
  const [steps, setSteps] = useState<
    { order: number; step_type: string; payload?: Record<string, unknown> }[]
  >([]);
  const [creating, setCreating] = useState(false);
  const [testSubscriberId, setTestSubscriberId] = useState("");
  const [triggeringId, setTriggeringId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const loadInProgressRef = useRef(false);

  const load = useCallback(() => {
    if (loadInProgressRef.current) return;
    loadInProgressRef.current = true;
    setLoading(true);
    setError(null);
    Promise.all([automationsApi.list(0, 100), subscribersApi.list(0, 500)])
      .then(([a, s]) => {
        setList(a);
        setSubscribers(s);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => {
        loadInProgressRef.current = false;
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredList = useMemo(() => {
    let out = list;
    if (statusFilter === "active") out = out.filter((a) => a.is_active);
    if (statusFilter === "paused") out = out.filter((a) => !a.is_active);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      out = out.filter((a) => a.name.toLowerCase().includes(q));
    }
    return out;
  }, [list, statusFilter, searchQuery]);

  const openEdit = (a: Automation) => {
    setEditingId(a.id);
    setName(a.name);
    setSteps(
      [...a.steps].sort((x, y) => x.order - y.order).map((s) => ({
        order: s.order,
        step_type: s.step_type,
        payload: s.payload ?? {},
      }))
    );
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setSteps([]);
    setTriggerType("subscriber_added");
  };

  const addStep = (type: "email" | "delay") => {
    setSteps((prev) => [
      ...prev,
      type === "email"
        ? { order: prev.length, step_type: "email", payload: { subject: "", html: "" } }
        : { order: prev.length, step_type: "delay", payload: { delay_minutes: 60 } },
    ]);
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    setError(null);
    setCreating(true);
    const stepsPayload = steps.map((s, i) => ({ ...s, order: i }));
    if (editingId) {
      automationsApi
        .update(editingId, { name, steps: stepsPayload })
        .then(() => {
          closeForm();
          load();
          setSuccessMessage("Automation updated.");
          setTimeout(() => setSuccessMessage(null), 4000);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to update"))
        .finally(() => setCreating(false));
    } else {
      automationsApi
        .create({
          name,
          trigger_type: triggerType,
          is_active: true,
          steps: stepsPayload,
        })
        .then(() => {
          closeForm();
          load();
          setSuccessMessage("Automation created. It will run for every new subscriber.");
          setTimeout(() => setSuccessMessage(null), 5000);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to create"))
        .finally(() => setCreating(false));
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    const { id, name: automationName } = deleteConfirm;
    setDeletingId(id);
    setError(null);
    automationsApi
      .delete(id)
      .then(() => {
        setDeleteConfirm(null);
        load();
        setSuccessMessage(`"${automationName}" deleted.`);
        setTimeout(() => setSuccessMessage(null), 4000);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to delete"))
      .finally(() => setDeletingId(null));
  };

  const handleToggleActive = (a: Automation) => {
    setTogglingId(a.id);
    setError(null);
    automationsApi
      .update(a.id, { is_active: !a.is_active })
      .then(() => {
        load();
        setSuccessMessage(a.is_active ? "Automation paused." : "Automation resumed.");
        setTimeout(() => setSuccessMessage(null), 4000);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to update");
      })
      .finally(() => setTogglingId(null));
  };

  const handleTrigger = (automationId: number) => {
    const subId = parseInt(testSubscriberId, 10);
    if (!subId) {
      setError("Select a subscriber to run the test.");
      return;
    }
    setTriggeringId(automationId);
    setError(null);
    automationsApi
      .trigger(automationId, { subscriber_id: subId })
      .then(() => {
        setTestSubscriberId("");
        setSuccessMessage("Test started. Emails send in order; delay steps need a worker (see tip below).");
        setTimeout(() => setSuccessMessage(null), 5000);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Trigger failed");
      })
      .finally(() => setTriggeringId(null));
  };

  const updateStepPayload = (index: number, key: string, value: string | number) => {
    setSteps((prev) => {
      const next = [...prev];
      const payload = { ...(next[index].payload || {}), [key]: value };
      next[index] = { ...next[index], payload };
      return next;
    });
  };

  const activeCount = list.filter((a) => a.is_active).length;
  const pausedCount = list.filter((a) => !a.is_active).length;

  return (
    <div className="page-root automations-page">
      <header className="page-header animate-in">
        <div>
          <h1 className="page-title">Automations</h1>
          <p className="page-subtitle">
            Send a series of emails automatically when something happens (e.g. welcome series when someone subscribes).
          </p>
        </div>
        <button
          onClick={() => {
            if (showForm) closeForm();
            else {
              setEditingId(null);
              setName("");
              setSteps([]);
              setTriggerType("subscriber_added");
              setShowForm(true);
            }
          }}
          className="btn-primary"
        >
          {showForm ? "Cancel" : "Create automation"}
        </button>
      </header>

      {/* How automations work + worker tip */}
      <section className="rounded-xl border border-(--card-border) bg-(--card-bg-subtle) p-4 mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-2">How automations work</h2>
        <ul className="text-sm text-muted space-y-1 list-disc list-inside">
          <li><strong className="text-foreground">Trigger</strong> — When the automation starts (e.g. when a subscriber is added).</li>
          <li><strong className="text-foreground">Steps</strong> — A sequence of emails and optional delays. The first email sends right away; delay steps wait before the next email.</li>
          <li><strong className="text-foreground">Runs automatically</strong> — Every new subscriber enters all active automations that use the &quot;subscriber added&quot; trigger.</li>
        </ul>
        <p className="text-xs text-muted-dim mt-3 pt-3 border-t border-(--card-border)">
          <strong className="text-foreground">Delay steps</strong> are processed by a background job. Call <code className="bg-(--surface) px-1 rounded">POST /api/workers/process-automation-delays</code> periodically (e.g. every minute via cron) so &quot;wait X minutes&quot; steps run on time.
        </p>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="dash-kpi-card">
          <p className="dash-kpi-value text-foreground"><AnimatedCounter value={list.length} /></p>
          <p className="dash-kpi-label">Total</p>
        </div>
        <div className="dash-kpi-card">
          <p className="dash-kpi-value text-success"><AnimatedCounter value={activeCount} /></p>
          <p className="dash-kpi-label">Active</p>
        </div>
        <div className="dash-kpi-card">
          <p className="dash-kpi-value text-muted-dim"><AnimatedCounter value={pausedCount} /></p>
          <p className="dash-kpi-label">Paused</p>
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

      {successMessage && (
        <div className="alert-success animate-in">
          <span>{successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage(null)} className="alert-dismiss" aria-label="Dismiss">Dismiss</button>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-automation-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="delete-automation-title" className="modal-title">Delete automation</h2>
              <button type="button" onClick={() => setDeleteConfirm(null)} className="modal-close" aria-label="Close">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="text-muted">
                Delete <strong className="text-foreground">{deleteConfirm.name}</strong>? This cannot be undone. Active runs will stop.
              </p>
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

      {/* Create / Edit form */}
      {showForm && (
        <div className="section-card add-card animate-in">
          <h2 className="section-title">{editingId ? "Edit automation" : "Create a new automation"}</h2>
          <p className="text-sm text-muted-dim mb-5">
            {editingId
              ? "Update the name or steps below. Changes apply to new runs only."
              : "Give it a name, choose when it starts, then add steps in order (emails and optional delays)."}
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="field-label">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-glass w-full max-w-md"
                placeholder="e.g. Welcome new subscriber"
                required
              />
            </div>

            {!editingId && (
              <div>
                <label className="field-label">When does this automation start?</label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                  className="input-glass select-glass w-full max-w-md"
                  aria-label="Trigger type"
                >
                  <option value="subscriber_added">When a subscriber is added</option>
                </select>
                <p className="text-xs text-muted-dim mt-1">Every new subscriber will enter this flow.</p>
              </div>
            )}

            <div>
              <label className="field-label">Steps (order matters)</label>
              <p className="text-xs text-muted-dim mb-3">
                Add email steps and optional delay steps. Delays wait before sending the next email.
              </p>
              <div className="flex gap-2 mb-3">
                <button type="button" onClick={() => addStep("email")} className="btn-ghost py-2 text-sm">+ Email</button>
                <button type="button" onClick={() => addStep("delay")} className="btn-ghost py-2 text-sm">+ Delay</button>
              </div>
              <div className="space-y-4">
                {steps.map((s, i) => (
                  <div key={i} className="rounded-xl border border-(--card-border) bg-(--surface-elevated) p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-dim">
                        Step {i + 1} — {s.step_type === "email" ? "Send email" : "Wait"}
                      </span>
                      <button type="button" onClick={() => removeStep(i)} className="text-xs font-medium text-muted-dim hover:text-danger transition-colors">Remove</button>
                    </div>
                    {s.step_type === "email" && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Email subject"
                          value={(s.payload?.subject as string) ?? ""}
                          onChange={(e) => updateStepPayload(i, "subject", e.target.value)}
                          className="input-glass w-full text-sm"
                        />
                        <textarea
                          placeholder="HTML body"
                          rows={3}
                          value={(s.payload?.html as string) ?? ""}
                          onChange={(e) => updateStepPayload(i, "html", e.target.value)}
                          className="input-glass w-full text-sm font-mono"
                        />
                      </div>
                    )}
                    {s.step_type === "delay" && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          placeholder="Minutes"
                          value={(s.payload?.delay_minutes as number) ?? 60}
                          onChange={(e) => updateStepPayload(i, "delay_minutes", parseInt(e.target.value, 10) || 0)}
                          className="input-glass w-28 text-sm"
                        />
                        <span className="text-sm text-muted-dim">minutes before next step</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {steps.length === 0 && (
                <p className="mt-2 text-sm text-muted-dim">Add at least one step (e.g. Email → Delay 60m → Email).</p>
              )}
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={steps.length === 0 || creating}>
                {creating ? (editingId ? "Saving…" : "Creating…") : editingId ? "Save changes" : "Create automation"}
              </button>
              {editingId && (
                <button type="button" onClick={closeForm} className="btn-ghost">Cancel</button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <section className="section-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="section-title mb-0">Your automations</h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-dim">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name"
                className="input-glass pl-11 w-52 sm:w-64"
                aria-label="Search automations"
              />
            </div>
            <div className="flex rounded-lg border border-(--card-border) p-0.5 bg-(--card-bg-subtle)">
              {(["all", "active", "paused"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    statusFilter === s ? "bg-(--surface) text-foreground shadow-sm" : "text-muted-dim hover:text-muted"
                  }`}
                >
                  {s === "all" ? "All" : s === "active" ? "Active" : "Paused"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && list.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center gap-3 py-12">
            <div className="spinner" />
            <span className="text-sm text-muted-dim">Loading automations…</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="empty-state-centered">
            <div className="empty-state-icon" aria-hidden>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            {list.length === 0 ? (
              <>
                <p className="font-semibold text-foreground">No automations yet</p>
                <p className="text-sm text-muted-dim mt-1 max-w-sm mx-auto">Create one to send a welcome series or follow-up emails when someone subscribes.</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-foreground">No matches</p>
                <p className="text-sm text-muted-dim mt-1">Try a different search or filter.</p>
                <button type="button" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }} className="btn-ghost mt-3 text-sm">Clear filters</button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredList.map((a) => (
              <div key={a.id} className="rounded-xl border border-(--card-border) bg-(--surface) p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="list-card-title mb-0">{a.name}</p>
                      {a.is_active ? (
                        <span className="badge badge-sent text-xs">Active</span>
                      ) : (
                        <span className="badge badge-draft text-xs">Paused</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-dim mt-1">
                      Trigger: when subscriber added · {a.steps.length} step{a.steps.length !== 1 ? "s" : ""} · Created {formatDate(a.created_at)}
                    </p>
                    <FlowPills steps={a.steps} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(a)}
                      disabled={togglingId === a.id}
                      className={a.is_active
                        ? "btn-ghost text-sm text-warning hover:bg-(--warning-muted) disabled:opacity-50"
                        : "btn-success text-sm py-1.5 px-2.5 disabled:opacity-50"}
                      title={a.is_active ? "Pause this automation" : "Resume this automation"}
                    >
                      {togglingId === a.id ? "…" : a.is_active ? "Pause" : "Resume"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(a)}
                      className="btn-ghost text-sm text-(--accent) hover:bg-[rgba(var(--accent-rgb),0.12)]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm({ id: a.id, name: a.name })}
                      className="btn-danger text-sm py-1.5 px-2.5"
                      title="Delete this automation"
                    >
                      Delete
                    </button>
                    <select
                      value={testSubscriberId}
                      onChange={(e) => setTestSubscriberId(e.target.value)}
                      className="input-glass text-sm min-w-[160px]"
                      aria-label="Choose subscriber to test with"
                    >
                      <option value="">Test with…</option>
                      {subscribers.slice(0, 100).map((s) => (
                        <option key={s.id} value={String(s.id)}>{s.email}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleTrigger(a.id)}
                      disabled={triggeringId === a.id || !testSubscriberId}
                      className="btn-primary text-sm py-1.5 px-2.5 disabled:opacity-50"
                    >
                      {triggeringId === a.id ? "Running…" : "Run test"}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-dim mt-3 pt-3 border-t border-(--card-border)">
                  Run test sends this flow once to the chosen subscriber. Use it to verify content and timing.
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
