"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { subscribersApi, groupsApi, tagsApi, type SubscriberProfile, type Group, type Tag } from "@/lib/api";
import { Badge, Button, Input, Modal } from "@/components/ui";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatEventType(eventType: string): string {
  const map: Record<string, string> = {
    subscriber_created: "Subscriber added",
    subscriber_imported: "Imported",
    unsubscribe: "Unsubscribed",
    campaign_sent: "Campaign sent",
    form_submitted: "Form submitted",
    automation_entered: "Entered automation",
    automation_completed: "Automation completed",
  };
  return map[eventType] ?? eventType.replace(/_/g, " ");
}

export default function SubscriberProfilePage() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const id = idParam ? parseInt(idParam, 10) : null;

  const [profile, setProfile] = useState<SubscriberProfile | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStatus, setEditStatus] = useState<string>("active");
  const [editCustomFields, setEditCustomFields] = useState<{ key: string; value: string }[]>([]);

  useEffect(() => {
    if (id == null || isNaN(id) || id < 1) {
      setLoading(false);
      setError("Invalid subscriber");
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([
      subscribersApi.getProfile(id),
      groupsApi.list(),
      tagsApi.list(),
    ])
      .then(([p, g, t]) => {
        setProfile(p);
        setGroups(g);
        setTags(t);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load profile"))
      .finally(() => setLoading(false));
  }, [id]);

  const openDeleteConfirm = () => setDeleteConfirmOpen(true);
  const handleConfirmDelete = () => {
    if (!id) return;
    setDeleting(true);
    subscribersApi
      .delete(id)
      .then(() => {
        window.location.href = "/subscribers";
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Delete failed");
        setDeleting(false);
        setDeleteConfirmOpen(false);
      });
  };

  const openEdit = useCallback(() => {
    if (!profile) return;
    const s = profile.subscriber;
    setEditName(s.name ?? "");
    setEditPhone(s.phone ?? "");
    setEditStatus(s.status ?? "active");
    setEditCustomFields(
      s.custom_fields && Object.keys(s.custom_fields).length > 0
        ? Object.entries(s.custom_fields).map(([key, value]) => ({ key, value: String(value) }))
        : [{ key: "", value: "" }]
    );
    setUpdateError(null);
    setEditOpen(true);
  }, [profile]);

  const handleSaveEdit = () => {
    if (!id) return;
    setSaving(true);
    setUpdateError(null);
    const custom_fields: Record<string, string> = {};
    editCustomFields.forEach(({ key, value }) => {
      if (key.trim()) custom_fields[key.trim()] = value;
    });
    subscribersApi
      .update(id, {
        name: editName.trim() || undefined,
        phone: editPhone.trim() || undefined,
        status: editStatus,
        custom_fields: Object.keys(custom_fields).length > 0 ? custom_fields : undefined,
      })
      .then(() => subscribersApi.getProfile(id))
      .then((updated) => {
        setProfile(updated);
        setEditOpen(false);
      })
      .catch((e) => setUpdateError(e instanceof Error ? e.message : "Update failed"))
      .finally(() => setSaving(false));
  };

  const addCustomFieldRow = () => setEditCustomFields((prev) => [...prev, { key: "", value: "" }]);
  const removeCustomFieldRow = (index: number) =>
    setEditCustomFields((prev) => prev.filter((_, i) => i !== index));
  const setCustomField = (index: number, field: "key" | "value", value: string) =>
    setEditCustomFields((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );

  if (id == null || isNaN(id) || id < 1) {
    return (
      <div className="page-root">
        <div className="section-card">
          <p className="text-muted">Missing or invalid subscriber ID.</p>
          <Link href="/subscribers" className="mt-4 inline-block text-sm font-medium text-[var(--accent)] hover:underline">
            ← Back to Subscribers
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-root">
        <header className="page-header">
          <h1 className="page-title">Subscriber profile</h1>
        </header>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="page-root">
        <header className="page-header">
          <h1 className="page-title">Subscriber profile</h1>
        </header>
        <div className="section-card">
          <p className="text-[var(--danger)]">{error ?? "Subscriber not found"}</p>
          <Link href="/subscribers" className="mt-4 inline-block text-sm font-medium text-[var(--accent)] hover:underline">
            ← Back to Subscribers
          </Link>
        </div>
      </div>
    );
  }

  const { subscriber, activity, campaigns_received, automation_runs, opens_count, clicks_count } = profile;
  const groupNames = (subscriber.group_ids ?? []).map((gid) => groups.find((g) => g.id === gid)?.name ?? `#${gid}`);
  const tagNames = (subscriber.tag_ids ?? []).map((tid) => tags.find((t) => t.id === tid)?.name ?? `#${tid}`);

  return (
    <div className="page-root subscribers-page">
      <header className="page-header flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/subscribers" className="mb-2 inline-block text-sm font-medium text-muted hover:text-foreground">
            ← Subscribers
          </Link>
          <h1 className="page-title mt-1">
            {subscriber.name || subscriber.email}
          </h1>
          <p className="page-subtitle mt-0.5">{subscriber.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={subscriber.status === "active" ? "active" : "draft"}>{subscriber.status}</Badge>
          <Button variant="secondary" size="sm" onClick={openEdit}>
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={openDeleteConfirm} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: details + engagement */}
        <div className="space-y-6 lg:col-span-2">
          <section className="section-card overflow-hidden">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="section-title mb-0">Details</h2>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={openEdit} className="text-[var(--accent)] -mr-1">
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={openDeleteConfirm} className="text-[var(--danger)] -mr-1" disabled={deleting}>
                  Delete subscriber
                </Button>
              </div>
            </div>

            {/* Contact & account — clean row list */}
            <div className="subscriber-detail-list rounded-xl border border-[var(--card-border)] bg-[var(--card-bg-subtle)]/50">
              <div className="subscriber-detail-row">
                <span className="subscriber-detail-label">Email</span>
                <span className="subscriber-detail-value font-medium">{subscriber.email}</span>
              </div>
              <div className="subscriber-detail-row">
                <span className="subscriber-detail-label">Name</span>
                <span className="subscriber-detail-value">{subscriber.name || "—"}</span>
              </div>
              <div className="subscriber-detail-row">
                <span className="subscriber-detail-label">Phone</span>
                <span className="subscriber-detail-value">{subscriber.phone || "—"}</span>
              </div>
              <div className="subscriber-detail-row">
                <span className="subscriber-detail-label">Status</span>
                <span className="subscriber-detail-value">
                  <Badge variant={subscriber.status === "active" ? "active" : "draft"} className="font-normal">
                    {subscriber.status}
                  </Badge>
                </span>
              </div>
              <div className="subscriber-detail-row border-b-0">
                <span className="subscriber-detail-label">Added</span>
                <span className="subscriber-detail-value text-[var(--muted)]">{formatDate(subscriber.created_at)}</span>
              </div>
            </div>

            {/* Groups & tags — modern pills */}
            {((subscriber.group_ids?.length ?? 0) > 0 || (subscriber.tag_ids?.length ?? 0) > 0) && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {(subscriber.group_ids?.length ?? 0) > 0 && (
                  <div>
                    <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--muted-dim)]">
                      Groups
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {groupNames.map((name, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--foreground)]"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(subscriber.tag_ids?.length ?? 0) > 0 && (
                  <div>
                    <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--muted-dim)]">
                      Tags
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {tagNames.map((name, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-lg bg-[var(--accent)]/12 px-3 py-1.5 text-sm font-medium text-[var(--accent)]"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Custom fields — minimal table */}
            {subscriber.custom_fields && Object.keys(subscriber.custom_fields).length > 0 && (
              <div className="mt-5 rounded-xl border border-[var(--card-border)] overflow-hidden">
                <div className="border-b border-[var(--card-border)] bg-[var(--card-bg-subtle)]/50 px-4 py-2.5">
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--muted-dim)]">
                    Custom fields
                  </p>
                </div>
                <div className="divide-y divide-[var(--card-border)]">
                  {Object.entries(subscriber.custom_fields).map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                    >
                      <span className="text-[var(--muted-dim)]">{k}</span>
                      <span className="font-medium text-[var(--foreground)] truncate max-w-[60%] text-right">
                        {String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="section-card">
            <h2 className="section-title">Engagement</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl bg-[var(--card-bg-subtle)] p-4">
                <p className="text-2xl font-bold tabular-nums text-foreground">{campaigns_received.length}</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-dim">Campaigns received</p>
              </div>
              <div className="rounded-xl bg-[var(--card-bg-subtle)] p-4">
                <p className="text-2xl font-bold tabular-nums text-foreground">{opens_count}</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-dim">Opens</p>
              </div>
              <div className="rounded-xl bg-[var(--card-bg-subtle)] p-4">
                <p className="text-2xl font-bold tabular-nums text-foreground">{clicks_count}</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-dim">Clicks</p>
              </div>
              <div className="rounded-xl bg-[var(--card-bg-subtle)] p-4">
                <p className="text-2xl font-bold tabular-nums text-foreground">{automation_runs.length}</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-dim">Automation runs</p>
              </div>
            </div>
          </section>

          <section className="section-card">
            <h2 className="section-title">Campaigns received</h2>
            {campaigns_received.length === 0 ? (
              <p className="text-sm text-muted">No campaigns sent yet.</p>
            ) : (
              <ul className="space-y-2">
                {campaigns_received.map((c) => (
                  <li key={`${c.campaign_id}-${c.sent_at}`} className="flex items-center justify-between gap-4 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg-subtle)] px-4 py-3">
                    <div>
                      <Link href={`/campaigns?id=${c.campaign_id}`} className="font-medium text-foreground hover:text-[var(--accent)]">
                        {c.campaign_name}
                      </Link>
                      {c.variant && <span className="ml-2 text-xs text-muted">Variant {c.variant}</span>}
                    </div>
                    <span className="text-sm text-muted-dim">{formatRelative(c.sent_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="section-card">
            <h2 className="section-title">Automation runs</h2>
            {automation_runs.length === 0 ? (
              <p className="text-sm text-muted">No automation runs.</p>
            ) : (
              <ul className="space-y-2">
                {automation_runs.map((r) => (
                  <li key={r.run_id} className="flex items-center justify-between gap-4 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg-subtle)] px-4 py-3">
                    <div>
                      <Link href={`/automations?id=${r.automation_id}`} className="font-medium text-foreground hover:text-[var(--accent)]">
                        {r.automation_name}
                      </Link>
                      <span className="ml-2">
                        <Badge variant={r.status === "completed" ? "active" : "draft"}>{r.status}</Badge>
                      </span>
                    </div>
                    <span className="text-sm text-muted-dim">{formatRelative(r.started_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right column: activity */}
        <div className="lg:col-span-1">
          <section className="section-card sticky top-24">
            <h2 className="section-title">Activity</h2>
            {activity.length === 0 ? (
              <p className="text-sm text-muted">No activity yet.</p>
            ) : (
              <ul className="space-y-3">
                {activity.map((a) => (
                  <li key={a.id} className="border-l-2 border-[var(--card-border)] pl-3">
                    <p className="text-sm font-medium text-foreground">{formatEventType(a.event_type)}</p>
                    <p className="text-xs text-muted-dim">{formatRelative(a.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* Delete confirmation */}
      <Modal
        open={deleteConfirmOpen}
        onClose={() => !deleting && setDeleteConfirmOpen(false)}
        title="Delete subscriber"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        }
      >
        <p className="text-muted">
          Remove <strong className="text-foreground">{subscriber.email}</strong> from your list? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
