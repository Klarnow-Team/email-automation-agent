"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  fieldsApi,
  groupsApi,
  subscribersApi,
  tagsApi,
  type Group,
  type SubscriberField,
  type SubscriberProfile,
  type Tag,
} from "@/lib/api";
import { Badge, Button, Modal } from "@/components/ui";

type EditableDefinedField = {
  key: string;
  title: string;
  field_type: string;
  value: string;
};

type EditableCustomField = {
  key: string;
  value: string;
};

type DisplayCustomField = {
  key: string;
  label: string;
  value: string;
  isDefined: boolean;
};

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
    "subscriber.created": "Subscriber added",
    subscriber_created: "Subscriber added",
    "subscriber.updated": "Profile updated",
    subscriber_updated: "Profile updated",
    "subscriber.imported": "Imported",
    subscriber_imported: "Imported",
    unsubscribe: "Unsubscribed",
    "campaign.sent": "Campaign sent",
    campaign_sent: "Campaign sent",
    "form.submitted": "Form submitted",
    form_submitted: "Form submitted",
    "automation.entered": "Entered automation",
    automation_entered: "Entered automation",
    "automation.completed": "Automation completed",
    automation_completed: "Automation completed",
  };
  return map[eventType] ?? eventType.replace(/[._]/g, " ");
}

function splitCustomFields(
  customFields: Record<string, string> | null | undefined,
  fieldDefinitions: SubscriberField[],
): {
  definedFields: EditableDefinedField[];
  extraFields: EditableCustomField[];
} {
  const values = customFields ?? {};
  const definedKeys = new Set(fieldDefinitions.map((field) => field.key));

  return {
    definedFields: fieldDefinitions.map((field) => ({
      key: field.key,
      title: field.title,
      field_type: field.field_type,
      value: values[field.key] != null ? String(values[field.key]) : "",
    })),
    extraFields: Object.entries(values)
      .filter(([key, value]) => !definedKeys.has(key) && String(value ?? "").trim() !== "")
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, value]) => ({
        key,
        value: String(value ?? ""),
      })),
  };
}

function buildDisplayCustomFields(
  customFields: Record<string, string> | null | undefined,
  fieldDefinitions: SubscriberField[],
): DisplayCustomField[] {
  const values = customFields ?? {};
  const definedFields = fieldDefinitions
    .map((field) => ({
      key: field.key,
      label: field.title,
      value: values[field.key] != null ? String(values[field.key]) : "",
      isDefined: true,
    }))
    .filter((field) => field.value.trim() !== "");

  const definedKeys = new Set(definedFields.map((field) => field.key));
  const extraFields = Object.entries(values)
    .filter(([key, value]) => !definedKeys.has(key) && String(value ?? "").trim() !== "")
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => ({
      key,
      label: key,
      value: String(value ?? ""),
      isDefined: false,
    }));

  return [...definedFields, ...extraFields];
}

function getCustomFieldInputType(fieldType: string, value: string): string {
  if (fieldType === "date") {
    return value && !/^\d{4}-\d{2}-\d{2}$/.test(value) ? "text" : "date";
  }
  if (fieldType === "number") {
    return value && Number.isNaN(Number(value)) ? "text" : "number";
  }
  return "text";
}

function getCustomFieldPlaceholder(fieldType: string): string {
  if (fieldType === "date") return "YYYY-MM-DD";
  if (fieldType === "number") return "0";
  return "Enter a value";
}

function SubscriberProfilePageContent() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const id = idParam ? parseInt(idParam, 10) : null;

  const [profile, setProfile] = useState<SubscriberProfile | null>(null);
  const [fieldDefinitions, setFieldDefinitions] = useState<SubscriberField[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStatus, setEditStatus] = useState<string>("active");
  const [editDefinedFields, setEditDefinedFields] = useState<EditableDefinedField[]>([]);
  const [editExtraFields, setEditExtraFields] = useState<EditableCustomField[]>([]);

  useEffect(() => {
    const subscriberId = id;
    if (subscriberId == null || isNaN(subscriberId) || subscriberId < 1) {
      return;
    }
    const validSubscriberId: number = subscriberId;
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError(null);
      try {
        const [profileResult, groupsResult, tagsResult, fieldsResult] = await Promise.allSettled([
          subscribersApi.getProfile(validSubscriberId),
          groupsApi.list(),
          tagsApi.list(),
          fieldsApi.list(),
        ]);
        if (cancelled) return;
        if (profileResult.status !== "fulfilled") {
          throw profileResult.reason;
        }
        setProfile(profileResult.value);
        setGroups(groupsResult.status === "fulfilled" ? groupsResult.value : []);
        setTags(tagsResult.status === "fulfilled" ? tagsResult.value : []);
        setFieldDefinitions(fieldsResult.status === "fulfilled" ? fieldsResult.value : []);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load profile");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
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
    const { definedFields, extraFields } = splitCustomFields(s.custom_fields, fieldDefinitions);
    setEditEmail(s.email ?? "");
    setEditName(s.name ?? "");
    setEditPhone(s.phone ?? "");
    setEditStatus(s.status ?? "active");
    setEditDefinedFields(definedFields);
    setEditExtraFields(extraFields);
    setUpdateError(null);
    setEditOpen(true);
  }, [fieldDefinitions, profile]);

  const handleSaveEdit = () => {
    if (!id) return;
    const trimmedEmail = editEmail.trim();
    if (!trimmedEmail) {
      setUpdateError("Email is required.");
      return;
    }

    const custom_fields: Record<string, string> = {};
    const duplicateKeys = new Set<string>();

    editDefinedFields.forEach(({ key, value }) => {
      const normalizedValue = value.trim();
      if (normalizedValue) {
        custom_fields[key] = normalizedValue;
      }
    });

    for (const { key, value } of editExtraFields) {
      const normalizedKey = key.trim();
      const normalizedValue = value.trim();
      if (!normalizedKey && !normalizedValue) continue;
      if (!normalizedKey) {
        setUpdateError("Every custom field needs a name, or remove the empty row.");
        return;
      }
      if (!normalizedValue) continue;
      if (Object.prototype.hasOwnProperty.call(custom_fields, normalizedKey)) {
        duplicateKeys.add(normalizedKey);
        continue;
      }
      custom_fields[normalizedKey] = normalizedValue;
    }

    if (duplicateKeys.size > 0) {
      setUpdateError(
        `Duplicate custom field key${duplicateKeys.size > 1 ? "s" : ""}: ${Array.from(duplicateKeys).join(", ")}.`,
      );
      return;
    }

    setSaving(true);
    setUpdateError(null);
    subscribersApi
      .update(id, {
        email: trimmedEmail,
        name: editName.trim() || null,
        phone: editPhone.trim() || null,
        status: editStatus,
        custom_fields,
      })
      .then(() => subscribersApi.getProfile(id))
      .then((updated) => {
        setProfile(updated);
        setEditOpen(false);
      })
      .catch((e) => setUpdateError(e instanceof Error ? e.message : "Update failed"))
      .finally(() => setSaving(false));
  };

  const addCustomFieldRow = () => setEditExtraFields((prev) => [...prev, { key: "", value: "" }]);
  const removeCustomFieldRow = (index: number) =>
    setEditExtraFields((prev) => prev.filter((_, i) => i !== index));
  const setCustomField = (index: number, field: "key" | "value", value: string) =>
    setEditExtraFields((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  const setDefinedFieldValue = (key: string, value: string) =>
    setEditDefinedFields((prev) =>
      prev.map((field) => (field.key === key ? { ...field, value } : field))
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
  const customFieldEntries = buildDisplayCustomFields(subscriber.custom_fields, fieldDefinitions);

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

            <div className="mt-5 rounded-xl border border-[var(--card-border)] overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--card-border)] bg-[var(--card-bg-subtle)]/50 px-4 py-2.5">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--muted-dim)]">
                  Custom fields
                </p>
                <div className="flex items-center gap-3">
                  <Link
                    href="/subscribers?view=fields"
                    className="text-xs font-medium text-[var(--accent)] hover:underline"
                  >
                    Manage fields
                  </Link>
                  <button
                    type="button"
                    onClick={openEdit}
                    className="text-xs font-medium text-[var(--accent)] hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </div>
              {customFieldEntries.length === 0 ? (
                <div className="px-4 py-4">
                  <p className="text-sm text-muted">No custom fields added yet.</p>
                  <Button variant="ghost" size="sm" onClick={openEdit} className="mt-3 text-[var(--accent)]">
                    Add custom field
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-[var(--card-border)]">
                  {customFieldEntries.map((field) => (
                    <div
                      key={field.key}
                      className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--foreground)]">{field.label}</p>
                        {field.isDefined && field.label !== field.key && (
                          <p className="mt-1 font-mono text-xs text-[var(--muted-dim)]">{field.key}</p>
                        )}
                      </div>
                      <span className="max-w-[60%] truncate text-right font-medium text-[var(--foreground)]">
                        {field.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
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

      <Modal
        open={editOpen}
        onClose={() => !saving && setEditOpen(false)}
        title="Edit subscriber"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="subscriber-profile-edit-form" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </>
        }
      >
        <form
          id="subscriber-profile-edit-form"
          onSubmit={(event) => {
            event.preventDefault();
            handleSaveEdit();
          }}
          className="space-y-5"
        >
          {updateError && (
            <div className="rounded-xl border border-[var(--danger)]/20 bg-[var(--danger)]/8 px-4 py-3 text-sm text-[var(--danger)]">
              {updateError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="field-label">Email</label>
              <input
                type="email"
                value={editEmail}
                onChange={(event) => setEditEmail(event.target.value)}
                className="input-glass w-full"
                placeholder="subscriber@example.com"
                required
              />
            </div>

            <div>
              <label className="field-label">Name</label>
              <input
                type="text"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                className="input-glass w-full"
                placeholder="Subscriber name"
              />
            </div>

            <div>
              <label className="field-label">Phone</label>
              <input
                type="tel"
                value={editPhone}
                onChange={(event) => setEditPhone(event.target.value)}
                className="input-glass w-full"
                placeholder="+44 7000 000000"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="field-label">Status</label>
              <select
                value={editStatus}
                onChange={(event) => setEditStatus(event.target.value)}
                className="input-glass select-glass w-full"
              >
                <option value="active">Active</option>
                <option value="unsubscribed">Unsubscribed</option>
                <option value="bounced">Bounced</option>
                <option value="suppressed">Suppressed</option>
              </select>
            </div>
          </div>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Defined custom fields</h3>
                <p className="text-xs text-muted-dim">
                  Saved field definitions you can reuse across subscribers.
                </p>
              </div>
              <Link
                href="/subscribers?view=fields"
                className="text-xs font-medium text-[var(--accent)] hover:underline"
              >
                Manage fields
              </Link>
            </div>

            {editDefinedFields.length === 0 ? (
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg-subtle)]/40 px-4 py-3 text-sm text-muted">
                No field definitions yet. You can still add one-off fields below.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {editDefinedFields.map((field) => (
                  <div key={field.key}>
                    <label className="field-label">
                      {field.title}
                      <span className="ml-1 font-mono text-[0.6875rem] text-[var(--muted-dim)]">
                        {field.key}
                      </span>
                    </label>
                    <input
                      type={getCustomFieldInputType(field.field_type, field.value)}
                      value={field.value}
                      onChange={(event) => setDefinedFieldValue(field.key, event.target.value)}
                      className="input-glass w-full"
                      placeholder={getCustomFieldPlaceholder(field.field_type)}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Additional custom fields</h3>
                <p className="text-xs text-muted-dim">
                  Add one-off fields directly on this subscriber profile.
                </p>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={addCustomFieldRow}>
                Add field
              </Button>
            </div>

            {editExtraFields.length === 0 ? (
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg-subtle)]/40 px-4 py-3 text-sm text-muted">
                No extra custom fields added.
              </div>
            ) : (
              <div className="space-y-3">
                {editExtraFields.map((field, index) => (
                  <div
                    key={`${field.key}-${index}`}
                    className="grid gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg-subtle)]/30 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                  >
                    <div>
                      <label className="field-label">Field key</label>
                      <input
                        type="text"
                        value={field.key}
                        onChange={(event) => setCustomField(index, "key", event.target.value)}
                        className="input-glass w-full"
                        placeholder="e.g. favorite_channel"
                      />
                    </div>
                    <div>
                      <label className="field-label">Value</label>
                      <input
                        type="text"
                        value={field.value}
                        onChange={(event) => setCustomField(index, "value", event.target.value)}
                        className="input-glass w-full"
                        placeholder="Enter a value"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCustomFieldRow(index)}
                        className="text-[var(--danger)]"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </form>
      </Modal>

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

export default function SubscriberProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="page-root">
          <header className="page-header">
            <h1 className="page-title">Subscriber profile</h1>
          </header>
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="spinner" />
          </div>
        </div>
      }
    >
      <SubscriberProfilePageContent />
    </Suspense>
  );
}
