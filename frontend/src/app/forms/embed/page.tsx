"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formsApi, type FormPublic } from "@/lib/api";

type FieldLike = {
  id: string;
  type: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  key?: string;
  consentText?: string;
  default?: string;
};

function parseFields(raw: unknown[] | null | undefined): FieldLike[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((f): f is Record<string, unknown> => f != null && typeof f === "object")
    .map((f) => ({
      id: String(f.id ?? ""),
      type: String(f.type ?? "text"),
      label: typeof f.label === "string" ? f.label : undefined,
      placeholder: typeof f.placeholder === "string" ? f.placeholder : undefined,
      required: Boolean(f.required),
      options: Array.isArray(f.options) ? f.options.map(String) : undefined,
      key: typeof f.key === "string" ? f.key : undefined,
      consentText: typeof f.consentText === "string" ? f.consentText : undefined,
      default: typeof f.default === "string" ? f.default : undefined,
    }));
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function submitUrl(formId: number): string {
  const base = API_BASE.replace(/\/$/, "") || "";
  return `${base}/api/forms/${formId}/submit`;
}

function EmbedFormPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const formId = id ? parseInt(id, 10) : NaN;

  const [form, setForm] = useState<FormPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>({});

  useEffect(() => {
    if (!id || !Number.isInteger(formId)) {
      setLoading(false);
      setError("Invalid form");
      return;
    }
    setLoading(true);
    setError(null);
    formsApi
      .getPublic(formId)
      .then((f) => {
        setForm(f);
        const initial: Record<string, string | boolean> = {};
        parseFields(f.fields).forEach((field) => {
          if (field.type === "hidden" && field.default) initial[fieldKey(field)] = field.default;
          if (field.type === "checkbox") initial[fieldKey(field)] = false;
        });
        setValues(initial);
      })
      .catch(() => setError("Form not found"))
      .finally(() => setLoading(false));
  }, [id, formId]);

  const fieldKey = useCallback((f: FieldLike) => f.key || f.id, []);

  const setFieldValue = useCallback((key: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form || submitting) return;
      const email = String(values["email"] ?? "").trim();
      if (!email) {
        setError("Email is required.");
        return;
      }
      setError(null);
      setSubmitting(true);
      try {
        const res = await fetch(submitUrl(form.id), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            name: values["name"] ? String(values["name"]).trim() : undefined,
            data: { ...values, email, name: values["name"] ? String(values["name"]).trim() : undefined },
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.detail || "Submission failed.");
          return;
        }
        setSuccessMessage(data.message || form.success_message || "Thank you for subscribing.");
        setRedirectUrl(data.redirect_url || form.redirect_url || null);
        setSuccess(true);
        if (data.redirect_url) {
          window.location.href = data.redirect_url;
          return;
        }
      } catch {
        setError("Something went wrong.");
      } finally {
        setSubmitting(false);
      }
    },
    [form, values, submitting]
  );

  useEffect(() => {
    if (success && redirectUrl) {
      window.location.href = redirectUrl;
    }
  }, [success, redirectUrl]);

  if (loading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center p-6">
        <p className="text-muted">Loading form…</p>
      </div>
    );
  }
  if (error && !form) {
    return (
      <div className="min-h-[200px] flex items-center justify-center p-6">
        <p className="text-danger">{error}</p>
      </div>
    );
  }
  if (!form) return null;

  const fields = parseFields(form.fields).filter((f) => f.type !== "submit");
  const submitLabel =
    parseFields(form.fields).find((f) => f.type === "submit")?.label || "Submit";

  return (
    <div className="min-h-[200px] p-6 max-w-lg mx-auto">
      <style>{`
        .embed-form * { box-sizing: border-box; }
        .embed-form label { display: block; }
        .embed-form input, .embed-form select, .embed-form textarea {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid var(--card-border, #e5e7eb);
          font-size: 0.875rem;
          background: var(--surface, #fff);
          color: var(--foreground, #111);
        }
        .embed-form button[type="submit"] {
          width: 100%;
          padding: 0.625rem 1rem;
          border-radius: 0.5rem;
          font-weight: 500;
          font-size: 0.875rem;
          background: var(--accent, #6366f1);
          color: white;
          border: none;
          cursor: pointer;
        }
        .embed-form button[type="submit"]:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
      {success && !redirectUrl ? (
        <div className="rounded-xl border border-(--card-border) bg-(--card-bg-subtle) p-6 text-center">
          <p className="text-foreground font-medium">{successMessage}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="embed-form space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{form.name}</h2>
          {error && <p className="text-sm text-danger">{error}</p>}
          {fields.map((field) => (
            <EmbedField
              key={field.id}
              field={field}
              value={values[fieldKey(field)]}
              onChange={(v) => setFieldValue(fieldKey(field), v)}
            />
          ))}
          <button type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : submitLabel}
          </button>
        </form>
      )}
    </div>
  );
}

export default function EmbedFormPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <p className="text-muted">Loading form…</p>
        </div>
      }
    >
      <EmbedFormPageContent />
    </Suspense>
  );
}

function EmbedField({
  field,
  value,
  onChange,
}: {
  field: FieldLike;
  value: string | boolean | undefined;
  onChange: (v: string | boolean) => void;
}) {
  const label = field.label || field.type;
  const placeholder = field.placeholder ?? "";
  const key = field.key || field.id;

  if (field.type === "hidden") {
    return (
      <input
        type="hidden"
        name={key}
        value={typeof value === "string" ? value : field.default ?? ""}
        readOnly
      />
    );
  }

  if (field.type === "email") {
    return (
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-dim">
          {label}
          {field.required ? " *" : ""}
        </label>
        <input
          type="email"
          name={key}
          required={field.required}
          placeholder={placeholder}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }
  if (field.type === "name" || field.type === "phone" || field.type === "text") {
    return (
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-dim">
          {label}
          {field.required ? " *" : ""}
        </label>
        <input
          type="text"
          name={key}
          required={field.required}
          placeholder={placeholder}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }
  if (field.type === "textarea") {
    return (
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-dim">
          {label}
          {field.required ? " *" : ""}
        </label>
        <textarea
          name={key}
          required={field.required}
          placeholder={placeholder}
          rows={3}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }
  if (field.type === "dropdown") {
    return (
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-dim">
          {label}
          {field.required ? " *" : ""}
        </label>
        <select
          name={key}
          required={field.required}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{placeholder || "Select…"}</option>
          {(field.options ?? []).map((o, i) => (
            <option key={i} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }
  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name={key}
          required={field.required}
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="text-sm text-foreground">
          {label}
          {field.required ? " *" : ""}
        </span>
      </label>
    );
  }
  if (field.type === "radio") {
    return (
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-dim">
          {label}
          {field.required ? " *" : ""}
        </p>
        <div className="space-y-1.5">
          {(field.options ?? []).map((o, i) => (
            <label key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name={key}
                required={field.required}
                value={o}
                checked={value === o}
                onChange={() => onChange(o)}
              />
              <span className="text-sm">{o}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }
  if (field.type === "gdpr") {
    return (
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          name={key}
          required={field.required}
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1"
        />
        <span className="text-sm text-muted">
          {field.consentText || "I agree to the privacy policy."}
        </span>
      </label>
    );
  }
  return null;
}
