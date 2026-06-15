"use client";

import { useCallback, useState } from "react";
import {
  FIELD_TYPES,
  createField,
  type FormFieldConfig,
  type FormFieldType,
} from "./form-builder-types";
import { Button, Input } from "@/components/ui";
import type { Form, Group, Automation } from "@/lib/api";

export type FormBuilderForm = {
  name: string;
  form_type: string;
  fields: FormFieldConfig[];
  success_message: string;
  redirect_url: string;
  add_to_group_id: number | null;
  trigger_automation_id: number | null;
};

type FormBuilderProps = {
  form: Form | null;
  groups: Group[];
  automations: Automation[];
  onSave: (data: FormBuilderForm) => Promise<void>;
  onCancel: () => void;
};

function parseFields(raw: unknown[] | null | undefined): FormFieldConfig[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((f): f is Record<string, unknown> => f != null && typeof f === "object")
    .map((f) => ({
      id: String(f.id ?? `f-${Math.random().toString(36).slice(2, 9)}`),
      type: (f.type as FormFieldType) || "text",
      label: typeof f.label === "string" ? f.label : undefined,
      placeholder: typeof f.placeholder === "string" ? f.placeholder : undefined,
      required: Boolean(f.required),
      default: typeof f.default === "string" ? f.default : undefined,
      options: Array.isArray(f.options) ? f.options.map(String) : undefined,
      width: f.width === "half" ? "half" : "full",
      key: typeof f.key === "string" ? f.key : undefined,
      consentText: typeof f.consentText === "string" ? f.consentText : undefined,
    }));
}

export function FormBuilder({ form, groups, automations, onSave, onCancel }: FormBuilderProps) {
  const [name, setName] = useState(form?.name ?? "");
  const [formType, setFormType] = useState(form?.form_type ?? "embed");
  const [fields, setFields] = useState<FormFieldConfig[]>(() =>
    form?.fields ? parseFields(form.fields) : []
  );
  const [successMessage, setSuccessMessage] = useState(form?.success_message ?? "Thank you for subscribing!");
  const [redirectUrl, setRedirectUrl] = useState(form?.redirect_url ?? "");
  const [addToGroupId, setAddToGroupId] = useState<number | null>(form?.add_to_group_id ?? null);
  const [triggerAutomationId, setTriggerAutomationId] = useState<number | null>(
    form?.trigger_automation_id ?? null
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedField = fields.find((f) => f.id === selectedId);

  const addField = useCallback((type: FormFieldType) => {
    setFields((prev) => [...prev, createField(type)]);
  }, []);

  const removeField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const updateField = useCallback((id: string, patch: Partial<FormFieldConfig>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f))
    );
  }, []);

  const moveField = useCallback((id: string, dir: "up" | "down") => {
    setFields((prev) => {
      const i = prev.findIndex((f) => f.id === id);
      if (i < 0) return prev;
      const j = dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        form_type: formType,
        fields,
        success_message: successMessage,
        redirect_url: redirectUrl,
        add_to_group_id: addToGroupId,
        trigger_automation_id: triggerAutomationId,
      });
    } finally {
      setSaving(false);
    }
  }, [
    name,
    formType,
    fields,
    successMessage,
    redirectUrl,
    addToGroupId,
    triggerAutomationId,
    onSave,
  ]);

  return (
    <div className="form-builder flex h-[calc(100vh-8rem)] min-h-[520px] gap-0 overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] shadow-lg">
      {/* Sidebar: add fields */}
      <aside className="form-builder-sidebar w-56 shrink-0 flex-col overflow-y-auto border-r border-[var(--card-border)] bg-[var(--surface-elevated)] p-4 flex">
        <div className="mb-3">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--muted-dim)]">Add field</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">Click to add to form</p>
        </div>
        <div className="space-y-2">
          {FIELD_TYPES.map(({ type, label }) => (
            <button
              key={type}
              type="button"
              onClick={() => addField(type)}
              className="form-builder-sidebar-item w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5 text-left text-sm text-[var(--foreground)] transition-colors hover:border-[var(--accent)]/50 hover:bg-[var(--surface-hover)]"
            >
              {label}
            </button>
          ))}
        </div>
      </aside>

      {/* Preview */}
      <div className="form-builder-preview relative flex flex-1 flex-col items-center overflow-y-auto border-r border-[var(--card-border)] bg-[var(--background)] p-8">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
              {name || "Form name"}
            </h3>
            <div className="space-y-4">
              {fields.length === 0 ? (
                <p className="rounded-xl border-2 border-dashed border-[var(--card-border)] py-8 text-center text-sm text-[var(--muted)]">
                  Add fields from the left sidebar
                </p>
              ) : (
                fields.map((f, index) => (
                  <PreviewField
                    key={f.id}
                    field={f}
                    selected={selectedId === f.id}
                    onSelect={() => setSelectedId(f.id)}
                    onRemove={() => removeField(f.id)}
                    onMoveUp={index > 0 ? () => moveField(f.id, "up") : undefined}
                    onMoveDown={index < fields.length - 1 ? () => moveField(f.id, "down") : undefined}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Settings panel */}
      <aside className="form-builder-settings w-80 shrink-0 flex flex-col overflow-hidden border-l border-[var(--card-border)] bg-[var(--surface-elevated)]">
        {selectedField ? (
          <>
            <div className="border-b border-[var(--card-border)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Field settings</h3>
              <p className="mt-0.5 text-xs text-[var(--muted)] capitalize">{selectedField.type}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedField.type === "hidden" && (
                <Input
                  label="Default value"
                  value={selectedField.default ?? ""}
                  onChange={(e) => updateField(selectedField.id, { default: e.target.value })}
                />
              )}
              {selectedField.type !== "hidden" && (
                <>
                  {selectedField.type !== "submit" && (
                    <Input
                      label="Label"
                      value={selectedField.label ?? ""}
                      onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                    />
                  )}
                  {(selectedField.type === "text" ||
                    selectedField.type === "email" ||
                    selectedField.type === "name" ||
                    selectedField.type === "phone" ||
                    selectedField.type === "textarea") && (
                    <Input
                      label="Placeholder"
                      value={selectedField.placeholder ?? ""}
                      onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                    />
                  )}
                  {selectedField.type !== "gdpr" && selectedField.type !== "submit" && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedField.required ?? false}
                        onChange={(e) =>
                          updateField(selectedField.id, { required: e.target.checked })
                        }
                        className="rounded border-[var(--card-border)]"
                      />
                      <span className="text-sm text-[var(--foreground)]">Required</span>
                    </label>
                  )}
                  {(selectedField.type === "dropdown" || selectedField.type === "radio") && (
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[var(--muted-dim)]">
                        Options (one per line)
                      </label>
                      <textarea
                        value={(selectedField.options ?? []).join("\n")}
                        onChange={(e) =>
                          updateField(selectedField.id, {
                            options: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                          })
                        }
                        rows={4}
                        className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                  {selectedField.type === "gdpr" && (
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[var(--muted-dim)]">
                        Consent text
                      </label>
                      <textarea
                        value={selectedField.consentText ?? ""}
                        onChange={(e) =>
                          updateField(selectedField.id, { consentText: e.target.value })
                        }
                        rows={3}
                        className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                  {selectedField.type === "submit" && (
                    <Input
                      label="Button text"
                      value={selectedField.label ?? "Submit"}
                      onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                    />
                  )}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--muted-dim)]">
                      Width
                    </label>
                    <select
                      value={selectedField.width ?? "full"}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          width: e.target.value as "full" | "half",
                        })
                      }
                      className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm"
                    >
                      <option value="full">Full</option>
                      <option value="half">Half</option>
                    </select>
                  </div>
                  {(selectedField.type === "text" ||
                    selectedField.type === "textarea" ||
                    selectedField.type === "checkbox" ||
                    selectedField.type === "dropdown" ||
                    selectedField.type === "radio") && (
                    <Input
                      label="Custom field key (for subscriber data)"
                      value={selectedField.key ?? ""}
                      onChange={(e) => updateField(selectedField.id, { key: e.target.value || undefined })}
                      placeholder="e.g. company"
                    />
                  )}
                </>
              )}
              <Button
                variant="danger"
                size="sm"
                className="w-full"
                onClick={() => removeField(selectedField.id)}
              >
                Remove field
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="border-b border-[var(--card-border)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Form settings</h3>
              <p className="mt-0.5 text-xs text-[var(--muted)]">Click a field in the preview to edit it</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <Input
                label="Form name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Newsletter signup"
              />
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--muted-dim)]">
                  Form type
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm"
                >
                  <option value="embed">Embedded</option>
                  <option value="popup">Popup</option>
                  <option value="landing">Landing page</option>
                  <option value="slide_in">Slide-in</option>
                </select>
              </div>
              <Input
                label="Success message"
                value={successMessage}
                onChange={(e) => setSuccessMessage(e.target.value)}
                placeholder="Thank you for subscribing!"
              />
              <Input
                label="Redirect URL (optional)"
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                placeholder="https://..."
              />
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--muted-dim)]">
                  Add subscriber to group
                </label>
                <select
                  value={addToGroupId ?? ""}
                  onChange={(e) =>
                    setAddToGroupId(e.target.value === "" ? null : Number(e.target.value))
                  }
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm"
                >
                  <option value="">— None —</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--muted-dim)]">
                  Trigger automation
                </label>
                <select
                  value={triggerAutomationId ?? ""}
                  onChange={(e) =>
                    setTriggerAutomationId(
                      e.target.value === "" ? null : Number(e.target.value)
                    )
                  }
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm"
                >
                  <option value="">— None —</option>
                  {automations.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}
      </aside>

      {/* Bottom bar */}
      <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-elevated)] px-5 py-3 shadow-xl">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? "Saving…" : form ? "Save changes" : "Create form"}
        </Button>
      </div>
    </div>
  );
}

function PreviewField({
  field,
  selected,
  onSelect,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  field: FormFieldConfig;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const widthClass = field.width === "half" ? "w-1/2" : "w-full";
  return (
    <div
      className={`group rounded-xl border-2 p-3 transition-colors ${
        selected
          ? "border-[var(--accent)] bg-[var(--accent)]/5"
          : "border-transparent bg-[var(--card-bg-subtle)] hover:border-[var(--card-border)]"
      }`}
    >
      <div className="flex items-start gap-2">
        <div
          className={`flex-1 cursor-pointer ${widthClass}`}
          onClick={onSelect}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onSelect()}
        >
          <PreviewFieldInput field={field} />
        </div>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {onMoveUp && (
            <button type="button" onClick={onMoveUp} className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]" aria-label="Move up">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
            </button>
          )}
          {onMoveDown && (
            <button type="button" onClick={onMoveDown} className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]" aria-label="Move down">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          )}
          <button type="button" onClick={onRemove} className="rounded p-1.5 text-[var(--danger)] hover:bg-[var(--danger-muted)]" aria-label="Remove">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewFieldInput({ field }: { field: FormFieldConfig }) {
  const label = field.label || field.type;
  const placeholder = field.placeholder ?? "";
  if (field.type === "email") {
    return (
      <>
        <label className="mb-1 block text-xs font-medium text-[var(--muted-dim)]">{label}{field.required ? " *" : ""}</label>
        <input type="email" placeholder={placeholder} className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm" readOnly disabled />
      </>
    );
  }
  if (field.type === "name" || field.type === "phone" || field.type === "text") {
    return (
      <>
        <label className="mb-1 block text-xs font-medium text-[var(--muted-dim)]">{label}{field.required ? " *" : ""}</label>
        <input type="text" placeholder={placeholder} className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm" readOnly disabled />
      </>
    );
  }
  if (field.type === "textarea") {
    return (
      <>
        <label className="mb-1 block text-xs font-medium text-[var(--muted-dim)]">{label}{field.required ? " *" : ""}</label>
        <textarea placeholder={placeholder} rows={2} className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm resize-none" readOnly disabled />
      </>
    );
  }
  if (field.type === "dropdown") {
    return (
      <>
        <label className="mb-1 block text-xs font-medium text-[var(--muted-dim)]">{label}{field.required ? " *" : ""}</label>
        <select className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm" disabled>
          <option value="">{placeholder || "Select..."}</option>
          {(field.options ?? []).map((o, i) => (
            <option key={i} value={o}>{o}</option>
          ))}
        </select>
      </>
    );
  }
  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2">
        <input type="checkbox" className="rounded border-[var(--card-border)]" disabled />
        <span className="text-sm text-[var(--foreground)]">{label}{field.required ? " *" : ""}</span>
      </label>
    );
  }
  if (field.type === "radio") {
    return (
      <>
        <p className="mb-1.5 text-xs font-medium text-[var(--muted-dim)]">{label}{field.required ? " *" : ""}</p>
        <div className="space-y-1.5">
          {(field.options ?? []).map((o, i) => (
            <label key={i} className="flex items-center gap-2">
              <input type="radio" name={field.id} className="border-[var(--card-border)]" disabled />
              <span className="text-sm">{o}</span>
            </label>
          ))}
        </div>
      </>
    );
  }
  if (field.type === "hidden") {
    return <p className="text-xs text-[var(--muted)]">Hidden field</p>;
  }
  if (field.type === "gdpr") {
    return (
      <label className="flex items-start gap-2">
        <input type="checkbox" className="mt-1 rounded border-[var(--card-border)]" disabled />
        <span className="text-sm text-[var(--muted)]">{field.consentText || "I agree..."}</span>
      </label>
    );
  }
  if (field.type === "submit") {
    return (
      <button type="button" className="w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-medium text-white" disabled>
        {label}
      </button>
    );
  }
  return null;
}
