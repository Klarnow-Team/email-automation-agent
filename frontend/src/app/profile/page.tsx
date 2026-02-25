"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  bookingProfileApi,
  eventTypesApi,
  type BookingProfile as BookingProfileType,
  type EventType,
} from "@/lib/api";

const SOCIAL_PLATFORMS = ["twitter", "linkedin", "github", "website"] as const;
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<BookingProfileType | null>(null);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [form, setForm] = useState<Partial<BookingProfileType>>({});

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([eventTypesApi.list(0, 100), bookingProfileApi.get()])
      .then(([et, p]) => {
        setEventTypes(et);
        setProfile(p);
        setForm({
          username: p.username,
          profile_photo_url: p.profile_photo_url ?? "",
          bio: p.bio ?? "",
          timezone: p.timezone,
          timezone_auto_detect: p.timezone_auto_detect,
          social_links: p.social_links ?? {},
          custom_branding_enabled: p.custom_branding_enabled,
          hidden_event_type_ids: p.hidden_event_type_ids ?? [],
          custom_url_slug: p.custom_url_slug ?? "",
          custom_domain: p.custom_domain ?? "",
          seo_title: p.seo_title ?? "",
          seo_description: p.seo_description ?? "",
          seo_image_url: p.seo_image_url ?? "",
          language: p.language,
        });
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "Failed to load";
        setEventTypes([]);
        setForm({
          username: "me",
          profile_photo_url: "",
          bio: "",
          timezone: "UTC",
          timezone_auto_detect: true,
          social_links: {},
          custom_branding_enabled: false,
          hidden_event_type_ids: [],
          custom_url_slug: "",
          custom_domain: "",
          seo_title: "",
          seo_description: "",
          seo_image_url: "",
          language: "en",
        });
        if (!msg.includes("404") && !msg.toLowerCase().includes("no profile")) {
          setError(msg);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!showSavedModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowSavedModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showSavedModal]);

  const updateField = <K extends keyof BookingProfileType>(key: K, value: BookingProfileType[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateSocial = (platform: string, url: string) => {
    setForm((prev) => ({
      ...prev,
      social_links: { ...(prev.social_links ?? {}), [platform]: url || undefined },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      profile_photo_url: form.profile_photo_url || null,
      bio: form.bio || null,
      custom_url_slug: form.custom_url_slug || null,
      custom_domain: form.custom_domain || null,
      seo_title: form.seo_title || null,
      seo_description: form.seo_description || null,
      seo_image_url: form.seo_image_url || null,
      social_links: form.social_links && Object.keys(form.social_links).length ? form.social_links : null,
    };
    bookingProfileApi
      .update(payload)
      .then((p) => {
        setProfile(p);
        setShowSavedModal(true);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to save"))
      .finally(() => setSaving(false));
  };

  if (loading) {
    return (
      <div className="page-root">
        <header className="page-header">
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">Your booking page profile and display settings</p>
        </header>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="spinner" />
          <span className="ml-3 text-sm text-muted-dim">Loading profile…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-root profile-page">
      <header className="page-header animate-in">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">
            Your booking page profile and display settings
          </p>
        </div>
        <Link href="/bookings" className="btn-ghost">
          Back to bookings
        </Link>
      </header>

      {/* How profile works */}
      <section className="rounded-xl border border-(--card-border) bg-(--card-bg-subtle) p-4 mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-2">About your profile</h2>
        <ul className="text-sm text-muted space-y-1 list-disc list-inside">
          <li><strong className="text-foreground">Booking page</strong> — Your slug, photo, and bio appear on the public booking page. Timezone and language affect how times are shown.</li>
          <li><strong className="text-foreground">Event types</strong> — Choose which event types are visible. Use URLs and SEO fields to customize the page for search and sharing.</li>
          <li><strong className="text-foreground">Save</strong> — Changes apply to your live booking page. Use &quot;Back to bookings&quot; to manage event types and availability.</li>
        </ul>
        <p className="text-xs text-muted-dim mt-3 pt-3 border-t border-(--card-border)">
          Custom branding and advanced URL/SEO options are available when enabled.
        </p>
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

      <form onSubmit={handleSubmit} className="space-y-8 pb-10">
        <section className="section-card add-card animate-in">
          <h2 className="section-title">Your profile</h2>
          <p className="text-sm text-muted-dim mb-5">
            Slug, photo, bio, timezone, and social links for your booking page.
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-4 sm:border-r border-(--card-border) sm:pr-6">
              <div>
                <label className="field-label">Booking page slug</label>
                <p className="text-xs text-muted-dim mb-1.5">
                  Used in the booking URL (e.g. /book/your-slug).
                </p>
                <input
                  type="text"
                  value={form.username ?? ""}
                  onChange={(e) => updateField("username", e.target.value.replace(/[^a-z0-9-_]/gi, ""))}
                  placeholder="me"
                  className="input-glass w-full max-w-xs"
                />
              </div>
              <div>
                <label className="field-label">Profile photo URL</label>
                <input
                  type="url"
                  value={form.profile_photo_url ?? ""}
                  onChange={(e) => updateField("profile_photo_url", e.target.value)}
                  placeholder="https://..."
                  className="input-glass w-full"
                />
              </div>
              <div>
                <label className="field-label">Bio</label>
                <textarea
                  value={form.bio ?? ""}
                  onChange={(e) => updateField("bio", e.target.value)}
                  placeholder="Short bio shown on the booking page"
                  rows={3}
                  className="input-glass w-full resize-y min-h-18"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="field-label">Timezone</label>
                <input
                  type="text"
                  value={form.timezone ?? "UTC"}
                  onChange={(e) => updateField("timezone", e.target.value)}
                  placeholder="America/New_York"
                  className="input-glass w-full"
                />
              </div>
              <label className="flex items-center gap-3 py-1 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.timezone_auto_detect ?? true}
                  onChange={(e) => updateField("timezone_auto_detect", e.target.checked)}
                  className="rounded border-(--card-border) bg-(--surface-elevated) text-(--accent) focus:ring-2 focus:ring-(--accent) focus:ring-offset-0"
                />
                <span className="text-sm text-muted group-hover:text-muted transition-colors">
                  Auto-detect timezone
                </span>
              </label>
              <div>
                <label className="field-label">Social links</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {SOCIAL_PLATFORMS.map((platform) => (
                    <input
                      key={platform}
                      type="url"
                      value={form.social_links?.[platform] ?? ""}
                      onChange={(e) => updateSocial(platform, e.target.value)}
                      placeholder={platform}
                      className="input-glass w-full text-sm"
                    />
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-3 py-1 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.custom_branding_enabled ?? false}
                  onChange={(e) => updateField("custom_branding_enabled", e.target.checked)}
                  className="rounded border-(--card-border) bg-(--surface-elevated) text-(--accent) focus:ring-2 focus:ring-(--accent) focus:ring-offset-0"
                />
                <span className="text-sm text-muted group-hover:text-muted transition-colors">
                  Custom branding
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400/90">
                  Pro
                </span>
              </label>
            </div>
          </div>
        </section>

        <section className="section-card animate-in">
          <h2 className="section-title">Booking page settings</h2>
          <p className="text-sm text-muted-dim mb-5">
            Control which event types are visible and how your booking page appears in search and when shared.
          </p>
          <div className="space-y-6">
            <div>
              <label className="field-label">Hide event types</label>
              <p className="text-xs text-muted-dim mb-3">
                Event types to hide from the booking page.
              </p>
              {eventTypes.length > 0 ? (
                <div className="rounded-xl border border-(--card-border) bg-(--card-bg-subtle) p-2">
                  <ul className="space-y-0.5">
                    {eventTypes.map((et) => {
                      const hidden = (form.hidden_event_type_ids ?? []).includes(et.id);
                      return (
                        <li key={et.id}>
                          <label className="flex items-center gap-3 py-2.5 px-3 cursor-pointer rounded-lg hover:bg-(--surface-hover) transition-colors">
                            <input
                              type="checkbox"
                              checked={hidden}
                              onChange={(e) => {
                                const ids = form.hidden_event_type_ids ?? [];
                                updateField(
                                  "hidden_event_type_ids",
                                  e.target.checked ? [...ids, et.id] : ids.filter((id) => id !== et.id)
                                );
                              }}
                              className="rounded border-(--card-border) bg-(--surface-elevated) text-(--accent) focus:ring-2 focus:ring-(--accent) focus:ring-offset-0"
                            />
                            <span className="text-sm text-muted">{et.name}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <div className="rounded-xl border border-(--card-border) bg-(--card-bg-subtle) px-4 py-4">
                  <p className="text-sm text-muted-dim">No event types yet. Create one from Bookings.</p>
                </div>
              )}
            </div>
            <div className="border-t border-(--card-border) pt-6">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-dim mb-3">URLs</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label">Custom URL slug</label>
                  <input
                    type="text"
                    value={form.custom_url_slug ?? ""}
                    onChange={(e) => updateField("custom_url_slug", e.target.value)}
                    placeholder="Optional override"
                    className="input-glass w-full"
                  />
                </div>
                <div>
                  <label className="field-label">Custom domain</label>
                  <input
                    type="text"
                    value={form.custom_domain ?? ""}
                    onChange={(e) => updateField("custom_domain", e.target.value)}
                    placeholder="book.yourdomain.com"
                    className="input-glass w-full"
                  />
                </div>
              </div>
            </div>
            <div className="border-t border-(--card-border) pt-6">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-dim mb-3">SEO</p>
              <div className="space-y-4">
                <div>
                  <label className="field-label">Title</label>
                  <input
                    type="text"
                    value={form.seo_title ?? ""}
                    onChange={(e) => updateField("seo_title", e.target.value)}
                    placeholder="Page title for search engines"
                    className="input-glass w-full max-w-md"
                  />
                </div>
                <div>
                  <label className="field-label">Description</label>
                  <textarea
                    value={form.seo_description ?? ""}
                    onChange={(e) => updateField("seo_description", e.target.value)}
                    placeholder="Meta description"
                    rows={2}
                    className="input-glass w-full max-w-md resize-y min-h-12"
                  />
                </div>
                <div>
                  <label className="field-label">Image URL</label>
                  <input
                    type="url"
                    value={form.seo_image_url ?? ""}
                    onChange={(e) => updateField("seo_image_url", e.target.value)}
                    placeholder="https://..."
                    className="input-glass w-full max-w-md"
                  />
                </div>
              </div>
            </div>
            <div className="border-t border-(--card-border) pt-6">
              <label className="field-label">Language</label>
              <select
                value={form.language ?? "en"}
                onChange={(e) => updateField("language", e.target.value)}
                className="input-glass w-full max-w-40"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <div className="section-card flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </button>
          <Link href="/bookings" className="btn-ghost">
            Cancel
          </Link>
          <span className="text-xs text-muted-dim ml-auto hidden sm:inline">
            Changes apply to your booking page.
          </span>
        </div>
      </form>

      {/* Save confirmation modal */}
      {showSavedModal && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setShowSavedModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-saved-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="profile-saved-title" className="modal-title">Profile saved</h2>
              <button
                type="button"
                onClick={() => setShowSavedModal(false)}
                className="modal-close"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-muted">
                Your profile has been saved successfully. Changes apply to your booking page.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setShowSavedModal(false)} className="btn-primary">
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
