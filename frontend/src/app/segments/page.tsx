"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { segmentsApi, type Segment } from "@/lib/api";
import { AnimatedCounter } from "@/components/AnimatedCounter";

export type SegmentRule = {
  field: string;
  op: string;
  value: string;
};

const RULE_FIELDS = [
  { value: "status", label: "Status" },
  { value: "email", label: "Email" },
  { value: "name", label: "Name" },
] as const;

const OPS_BY_FIELD: Record<string, { value: string; label: string }[]> = {
  status: [
    { value: "eq", label: "equals" },
    { value: "ne", label: "does not equal" },
  ],
  email: [
    { value: "eq", label: "equals" },
    { value: "ne", label: "does not equal" },
    { value: "contains", label: "contains" },
    { value: "startswith", label: "starts with" },
  ],
  name: [
    { value: "eq", label: "equals" },
    { value: "ne", label: "does not equal" },
    { value: "contains", label: "contains" },
    { value: "startswith", label: "starts with" },
  ],
};

function rulesFromSegment(rules: unknown): SegmentRule[] {
  if (!Array.isArray(rules)) return [];
  return rules
    .filter((r): r is Record<string, unknown> => r != null && typeof r === "object")
    .map((r) => ({
      field: typeof r.field === "string" ? r.field : "status",
      op: typeof r.op === "string" ? r.op : "eq",
      value: typeof r.value === "string" ? r.value : String(r.value ?? ""),
    }));
}

function ruleSummary(rule: SegmentRule): string {
  const field = RULE_FIELDS.find((f) => f.value === rule.field)?.label ?? rule.field;
  const opList = OPS_BY_FIELD[rule.field] ?? OPS_BY_FIELD.status;
  const op = opList.find((o) => o.value === rule.op)?.label ?? rule.op;
  return `${field} ${op} "${rule.value}"`;
}

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

function RulePills({ rules }: { rules: SegmentRule[] }) {
  if (!rules.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      {rules.map((rule, i) => {
        const full = ruleSummary(rule);
        const short = rule.value.length > 20 ? `${rule.field} ${rule.op} "${rule.value.slice(0, 18)}…"` : full;
        return (
          <span
            key={i}
            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-(--surface-elevated) text-foreground border border-(--card-border) max-w-full truncate"
            title={full}
          >
            {rule.field === "status" ? "● " : rule.field === "email" ? "✉ " : "◇ "}
            {short}
          </span>
        );
      })}
    </div>
  );
}

export default function SegmentsPage() {
  const [list, setList] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [rules, setRules] = useState<SegmentRule[]>([]);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [matchCountLoading, setMatchCountLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [ruleFilter, setRuleFilter] = useState<"all" | "with_rules" | "all_subscribers">("all");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    segmentsApi
      .list()
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredList = useMemo(() => {
    let out = list;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      out = out.filter((s) => s.name.toLowerCase().includes(q));
    }
    if (ruleFilter === "with_rules") {
      out = out.filter((s) => Array.isArray(s.rules) && s.rules.length > 0);
    }
    if (ruleFilter === "all_subscribers") {
      out = out.filter((s) => !Array.isArray(s.rules) || s.rules.length === 0);
    }
    return out;
  }, [list, searchQuery, ruleFilter]);

  const openEdit = (seg: Segment) => {
    setEditingId(seg.id);
    setName(seg.name);
    setRules(rulesFromSegment(seg.rules));
    setShowForm(true);
    setMatchCount(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setRules([]);
    setMatchCount(null);
  };

  const addRule = () => {
    setRules((prev) => [...prev, { field: "status", op: "eq", value: "active" }]);
  };

  const removeRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, key: keyof SegmentRule, value: string) => {
    setRules((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      if (key === "field") {
        const ops = OPS_BY_FIELD[value] ?? OPS_BY_FIELD.status;
        const hasOp = ops.some((o) => o.value === next[index].op);
        if (!hasOp) next[index].op = ops[0]?.value ?? "eq";
      }
      return next;
    });
  };

  const fetchMatchCount = useCallback(() => {
    if (editingId == null) return;
    setMatchCountLoading(true);
    segmentsApi
      .getSubscriberIds(editingId)
      .then((res) => setMatchCount(res.count))
      .catch(() => setMatchCount(null))
      .finally(() => setMatchCountLoading(false));
  }, [editingId]);

  useEffect(() => {
    if (showForm && editingId != null) fetchMatchCount();
  }, [showForm, editingId, fetchMatchCount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if (creating || saving) return;
    setError(null);
    const rulesPayload = rules.map((r) => ({ field: r.field, op: r.op, value: r.value }));

    if (editingId != null) {
      setSaving(true);
      segmentsApi
        .update(editingId, { name: trimmedName, rules: rulesPayload })
        .then(() => {
          closeForm();
          load();
          setSuccessMessage("Segment updated.");
          setTimeout(() => setSuccessMessage(null), 4000);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to update"))
        .finally(() => setSaving(false));
    } else {
      setCreating(true);
      segmentsApi
        .create({ name: trimmedName, rules: rulesPayload })
        .then(() => {
          closeForm();
          load();
          setSuccessMessage("Segment created. Use it to target campaigns or automations.");
          setTimeout(() => setSuccessMessage(null), 5000);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to create"))
        .finally(() => setCreating(false));
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    const { id, name: segmentName } = deleteConfirm;
    setDeletingId(id);
    setError(null);
    segmentsApi
      .delete(id)
      .then(() => {
        setDeleteConfirm(null);
        load();
        setSuccessMessage(`"${segmentName}" deleted.`);
        setTimeout(() => setSuccessMessage(null), 4000);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to delete"))
      .finally(() => setDeletingId(null));
  };

  useEffect(() => {
    if (!deleteConfirm) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDeleteConfirm(null);
    };
    document.addEventListener("keydown", onEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "";
    };
  }, [deleteConfirm]);

  if (loading && list.length === 0) {
    return (
      <div className="page-root">
        <header className="page-header">
          <div>
            <h1 className="page-title">Segments</h1>
            <p className="page-subtitle">Define audience segments for targeting campaigns</p>
          </div>
        </header>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="spinner" />
          <span className="ml-3 text-sm text-muted-dim">Loading segments…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-root segments-page">
      <header className="page-header animate-in">
        <div>
          <h1 className="page-title">Segments</h1>
          <p className="page-subtitle">
            Define audience segments for targeting campaigns
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (showForm) closeForm();
            else {
              setEditingId(null);
              setName("");
              setRules([]);
              setShowForm(true);
            }
          }}
          className="btn-primary"
        >
          {showForm ? "Cancel" : "Create segment"}
        </button>
      </header>

      {/* How segments work */}
      <section className="rounded-xl border border-(--card-border) bg-(--card-bg-subtle) p-4 mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-2">How segments work</h2>
        <ul className="text-sm text-muted space-y-1 list-disc list-inside">
          <li><strong className="text-foreground">Rules</strong> — Filter subscribers by status, email, or name (e.g. status equals &quot;active&quot;, email contains &quot;@company.com&quot;).</li>
          <li><strong className="text-foreground">All must match</strong> — Multiple rules act as AND: only subscribers matching every rule are included.</li>
          <li><strong className="text-foreground">Use in campaigns</strong> — When sending a campaign or targeting an automation, you can choose a segment to limit who receives it.</li>
        </ul>
        <p className="text-xs text-muted-dim mt-3 pt-3 border-t border-(--card-border)">
          Leave rules empty to include <strong className="text-foreground">all subscribers</strong>. Status values are typically &quot;active&quot; or &quot;inactive&quot;.
        </p>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="dash-kpi-card">
          <p className="dash-kpi-value text-foreground">
            <AnimatedCounter value={list.length} />
          </p>
          <p className="dash-kpi-label">Total segments</p>
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
          <button type="button" onClick={() => setSuccessMessage(null)} className="alert-dismiss" aria-label="Dismiss">
            Dismiss
          </button>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-segment-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="delete-segment-title" className="modal-title">Delete segment</h2>
              <button type="button" onClick={() => setDeleteConfirm(null)} className="modal-close" aria-label="Close">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="text-muted">
                Delete <strong className="text-foreground">{deleteConfirm.name}</strong>? This cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setDeleteConfirm(null)} className="btn-ghost">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="btn-danger disabled:opacity-50"
                disabled={deletingId !== null}
              >
                {deletingId !== null ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit form with rule builder */}
      {showForm && (
        <div className="section-card add-card animate-in">
          <h2 className="section-title">{editingId != null ? "Edit segment" : "Create segment"}</h2>
          <p className="text-sm text-muted-dim mb-5">
            {editingId != null
              ? "Update the name or rules below. Rules filter which subscribers belong to this segment."
              : "Give the segment a name, then add rules to filter subscribers. Leave rules empty to match all subscribers."}
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="field-label">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-glass w-full max-w-md"
                placeholder="e.g. Active subscribers"
                required
              />
            </div>

            <div>
              <label className="field-label">Rules (all must match)</label>
              <p className="text-xs text-muted-dim mb-3">
                Status: use &quot;active&quot; or &quot;inactive&quot;. Email and Name support equals, not equals, contains, and starts with.
              </p>
              <div className="flex gap-2 mb-3">
                <button type="button" onClick={addRule} className="btn-ghost py-2 text-sm">
                  + Add rule
                </button>
              </div>
              <div className="space-y-4">
                {rules.length === 0 ? (
                  <p className="text-sm text-muted-dim py-2">No rules — segment will include all subscribers.</p>
                ) : (
                  rules.map((rule, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-(--card-border) bg-(--surface-elevated) p-4"
                    >
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-dim">
                          Rule {i + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeRule(i)}
                          className="text-xs font-medium text-muted-dim hover:text-danger transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="flex flex-wrap items-end gap-3">
                        <div>
                          <label className="sr-only">Field</label>
                          <select
                            value={rule.field}
                            onChange={(e) => updateRule(i, "field", e.target.value)}
                            className="input-glass select-glass text-sm min-w-[100px]"
                            aria-label="Field"
                          >
                            {RULE_FIELDS.map((f) => (
                              <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="sr-only">Operator</label>
                          <select
                            value={rule.op}
                            onChange={(e) => updateRule(i, "op", e.target.value)}
                            className="input-glass select-glass text-sm min-w-[130px]"
                            aria-label="Operator"
                          >
                            {(OPS_BY_FIELD[rule.field] ?? OPS_BY_FIELD.status).map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="min-w-[160px] flex-1">
                          <label className="sr-only">Value</label>
                          <input
                            type="text"
                            value={rule.value}
                            onChange={(e) => updateRule(i, "value", e.target.value)}
                            className="input-glass w-full text-sm"
                            placeholder={rule.field === "status" ? "e.g. active" : "Value"}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {editingId != null && (
              <div className="rounded-lg border border-(--card-border) bg-(--card-bg-subtle) p-3">
                <p className="text-sm font-medium text-foreground mb-1">Subscribers matching this segment</p>
                {matchCountLoading ? (
                  <span className="text-sm text-muted-dim">Loading…</span>
                ) : matchCount !== null ? (
                  <p className="text-sm text-muted-dim">
                    <span className="font-semibold text-foreground">{matchCount}</span> subscriber{matchCount !== 1 ? "s" : ""} match
                    <button
                      type="button"
                      onClick={fetchMatchCount}
                      className="btn-ghost text-xs ml-2"
                    >
                      Refresh
                    </button>
                  </p>
                ) : (
                  <span className="text-sm text-muted-dim">Could not load count.</span>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                className="btn-primary"
                disabled={creating || saving}
              >
                {creating ? "Creating…" : saving ? "Saving…" : editingId != null ? "Save changes" : "Create segment"}
              </button>
              {editingId != null && (
                <button type="button" onClick={closeForm} className="btn-ghost">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <section className="section-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="section-title mb-0">Your segments</h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-dim">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name"
                className="input-glass pl-11 w-52 sm:w-64"
                aria-label="Search segments"
              />
            </div>
            <div className="flex rounded-lg border border-(--card-border) p-0.5 bg-(--card-bg-subtle)">
              {(["all", "with_rules", "all_subscribers"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRuleFilter(s)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    ruleFilter === s ? "bg-(--surface) text-foreground shadow-sm" : "text-muted-dim hover:text-muted"
                  }`}
                >
                  {s === "all" ? "All" : s === "with_rules" ? "With rules" : "All subscribers"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && list.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center gap-3 py-12">
            <div className="spinner" />
            <span className="text-sm text-muted-dim">Loading segments…</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="empty-state-centered">
            <div className="empty-state-icon" aria-hidden>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            {list.length === 0 ? (
              <>
                <p className="font-semibold text-foreground">No segments yet</p>
                <p className="text-sm text-muted-dim mt-1">Create a segment to target specific audiences in campaigns.</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-foreground">No matches</p>
                <p className="text-sm text-muted-dim mt-1">Try a different search or filter.</p>
                <button
                  type="button"
                  onClick={() => { setSearchQuery(""); setRuleFilter("all"); }}
                  className="btn-ghost mt-3 text-sm"
                >
                  Clear filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredList.map((seg) => {
              const segRules = rulesFromSegment(seg.rules);
              return (
                <div key={seg.id} className="rounded-xl border border-(--card-border) bg-(--surface) p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="list-card-title mb-0">{seg.name}</p>
                      <p className="text-sm text-muted-dim mt-1">
                        {segRules.length === 0
                          ? "All subscribers"
                          : `${segRules.length} rule${segRules.length !== 1 ? "s" : ""}`}
                        {" · "}
                        Created {formatDate(seg.created_at)}
                      </p>
                      <RulePills rules={segRules} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(seg)}
                        className="btn-ghost text-sm text-(--accent) hover:bg-[rgba(var(--accent-rgb),0.12)]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm({ id: seg.id, name: seg.name })}
                        className="btn-danger text-sm py-1.5 px-2.5"
                        title="Delete this segment"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
