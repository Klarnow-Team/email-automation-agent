"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { eventTypesApi } from "@/lib/api";

const LOCATION_TYPES = [
  { value: "", label: "No location" },
  { value: "google_meet", label: "Google Meet" },
  { value: "zoom", label: "Zoom" },
  { value: "teams", label: "Microsoft Teams" },
  { value: "phone", label: "Phone call" },
  { value: "in_person", label: "In-person" },
  { value: "custom", label: "Custom link" },
];

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function NewEventTypePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [description, setDescription] = useState("");
  const [locationType, setLocationType] = useState("");
  const [locationLink, setLocationLink] = useState("");
  const [bufferBefore, setBufferBefore] = useState(0);
  const [bufferAfter, setBufferAfter] = useState(0);
  const [minimumNotice, setMinimumNotice] = useState(0);
  const [dateRangeStartDays, setDateRangeStartDays] = useState<number | "">("");
  const [dateRangeEndDays, setDateRangeEndDays] = useState<number | "">("");
  const [maxBookingsPerDay, setMaxBookingsPerDay] = useState<number | "">("");
  const [maxFutureBookings, setMaxFutureBookings] = useState<number | "">("");
  const [timezone, setTimezone] = useState("");
  const [slotCapacity, setSlotCapacity] = useState(1);
  const [maxBookingsPerInvitee, setMaxBookingsPerInvitee] = useState<number | "">("");
  const [maxBookingsPerInviteePeriodDays, setMaxBookingsPerInviteePeriodDays] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slug || slug === slugify(name)) setSlug(slugify(v));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setLoading(true);
    setError(null);
    const body: Parameters<typeof eventTypesApi.create>[0] = {
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      duration_minutes: durationMinutes,
      description: description.trim() || undefined,
      location_type: locationType || undefined,
      location_link: locationLink.trim() || undefined,
      buffer_before_minutes: bufferBefore,
      buffer_after_minutes: bufferAfter,
      minimum_notice_minutes: minimumNotice,
      date_range_start_days: dateRangeStartDays === "" ? undefined : Number(dateRangeStartDays),
      date_range_end_days: dateRangeEndDays === "" ? undefined : Number(dateRangeEndDays),
      max_bookings_per_day: maxBookingsPerDay === "" ? undefined : Number(maxBookingsPerDay),
      max_future_bookings: maxFutureBookings === "" ? undefined : Number(maxFutureBookings),
      timezone: timezone.trim() || undefined,
      slot_capacity: slotCapacity,
      max_bookings_per_invitee: maxBookingsPerInvitee === "" ? undefined : Number(maxBookingsPerInvitee),
      max_bookings_per_invitee_period_days: maxBookingsPerInviteePeriodDays === "" ? undefined : Number(maxBookingsPerInviteePeriodDays),
    };
    eventTypesApi
      .create(body)
      .then(() => router.push("/bookings"))
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to create");
        setLoading(false);
      });
  };

  return (
    <div className="page-root">
      <header className="page-header animate-in">
        <div>
          <Link href="/bookings" className="text-sm text-muted-dim hover:text-zinc-300 mb-1 inline-block transition-colors">
            ← Bookings
          </Link>
          <h1 className="page-title">Create event type</h1>
          <p className="page-subtitle">Add a new bookable event type with optional location, buffer, and limits</p>
        </div>
      </header>

      {error && (
        <div className="alert-error animate-in">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="alert-dismiss" aria-label="Dismiss">
            Dismiss
          </button>
        </div>
      )}

      <div className="section-card animate-in max-w-2xl">
        <h2 className="section-title">Basic settings</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-muted">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. 30 Min Meeting"
              className="input-glass w-full"
              required
            />
          </div>
          <div>
            <label htmlFor="slug" className="mb-1.5 block text-sm font-medium text-muted">Slug (URL-friendly)</label>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="30-min-meeting"
              className="input-glass w-full"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">Duration</label>
            <div className="flex flex-wrap gap-2">
              {DURATION_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDurationMinutes(m)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    durationMinutes === m ? "bg-[var(--accent)] text-on-accent" : "bg-[var(--surface-elevated)] text-muted hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  {m}m
                </button>
              ))}
              <input
                type="number"
                min={5}
                step={5}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value) || 30)}
                className="input-glass w-20 text-center"
              />
              <span className="self-center text-sm text-muted-dim">min</span>
            </div>
          </div>
          <div>
            <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-muted">Description (optional)</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description for invitees"
              className="input-glass w-full min-h-[80px]"
              rows={3}
            />
          </div>

          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-dim pt-2">Location</h3>
          <div>
            <label htmlFor="locationType" className="mb-1.5 block text-sm font-medium text-muted">Location type</label>
            <select
              id="locationType"
              value={locationType}
              onChange={(e) => setLocationType(e.target.value)}
              className="input-glass w-full"
            >
              {LOCATION_TYPES.map((o) => (
                <option key={o.value || "none"} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          {(locationType === "custom" || locationType === "google_meet" || locationType === "zoom" || locationType === "teams") && (
            <div>
              <label htmlFor="locationLink" className="mb-1.5 block text-sm font-medium text-muted">Link or URL</label>
              <input
                id="locationLink"
                type="url"
                value={locationLink}
                onChange={(e) => setLocationLink(e.target.value)}
                placeholder="https://..."
                className="input-glass w-full"
              />
            </div>
          )}

          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-dim pt-2">Buffer & notice</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="bufferBefore" className="mb-1.5 block text-sm font-medium text-muted">Buffer before (min)</label>
              <input
                id="bufferBefore"
                type="number"
                min={0}
                value={bufferBefore}
                onChange={(e) => setBufferBefore(Number(e.target.value) || 0)}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label htmlFor="bufferAfter" className="mb-1.5 block text-sm font-medium text-muted">Buffer after (min)</label>
              <input
                id="bufferAfter"
                type="number"
                min={0}
                value={bufferAfter}
                onChange={(e) => setBufferAfter(Number(e.target.value) || 0)}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label htmlFor="minimumNotice" className="mb-1.5 block text-sm font-medium text-muted">Min. notice (min)</label>
              <input
                id="minimumNotice"
                type="number"
                min={0}
                value={minimumNotice}
                onChange={(e) => setMinimumNotice(Number(e.target.value) || 0)}
                className="input-glass w-full"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm font-medium text-[var(--accent)] hover:underline"
          >
            {showAdvanced ? "Hide" : "Show"} date range & booking limits
          </button>
          {showAdvanced && (
            <>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-dim pt-2">Date range</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dateRangeStart" className="mb-1.5 block text-sm font-medium text-muted">Bookable from (days from today)</label>
                  <input
                    id="dateRangeStart"
                    type="number"
                    min={0}
                    value={dateRangeStartDays}
                    onChange={(e) => setDateRangeStartDays(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0"
                    className="input-glass w-full"
                  />
                </div>
                <div>
                  <label htmlFor="dateRangeEnd" className="mb-1.5 block text-sm font-medium text-muted">Bookable up to (days ahead)</label>
                  <input
                    id="dateRangeEnd"
                    type="number"
                    min={1}
                    value={dateRangeEndDays}
                    onChange={(e) => setDateRangeEndDays(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="e.g. 30"
                    className="input-glass w-full"
                  />
                </div>
              </div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-dim pt-2">Booking limits</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="maxPerDay" className="mb-1.5 block text-sm font-medium text-muted">Max bookings per day</label>
                  <input
                    id="maxPerDay"
                    type="number"
                    min={1}
                    value={maxBookingsPerDay}
                    onChange={(e) => setMaxBookingsPerDay(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="No limit"
                    className="input-glass w-full"
                  />
                </div>
                <div>
                  <label htmlFor="maxFuture" className="mb-1.5 block text-sm font-medium text-muted">Max future bookings</label>
                  <input
                    id="maxFuture"
                    type="number"
                    min={1}
                    value={maxFutureBookings}
                    onChange={(e) => setMaxFutureBookings(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="No limit"
                    className="input-glass w-full"
                  />
                </div>
                <div>
                  <label htmlFor="slotCapacity" className="mb-1.5 block text-sm font-medium text-muted">Slot capacity (group size)</label>
                  <input
                    id="slotCapacity"
                    type="number"
                    min={1}
                    value={slotCapacity}
                    onChange={(e) => setSlotCapacity(Number(e.target.value) || 1)}
                    className="input-glass w-full"
                  />
                  <p className="mt-1 text-xs text-muted-dim">1 = one-to-one; &gt;1 = group event</p>
                </div>
                <div>
                  <label htmlFor="timezone" className="mb-1.5 block text-sm font-medium text-muted">Timezone</label>
                  <input
                    id="timezone"
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="e.g. America/New_York"
                    className="input-glass w-full"
                  />
                </div>
                <div>
                  <label htmlFor="maxPerInvitee" className="mb-1.5 block text-sm font-medium text-muted">Max bookings per invitee</label>
                  <input
                    id="maxPerInvitee"
                    type="number"
                    min={1}
                    value={maxBookingsPerInvitee}
                    onChange={(e) => setMaxBookingsPerInvitee(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="No limit"
                    className="input-glass w-full"
                  />
                </div>
                <div>
                  <label htmlFor="maxPerInviteePeriod" className="mb-1.5 block text-sm font-medium text-muted">Per period (days)</label>
                  <input
                    id="maxPerInviteePeriod"
                    type="number"
                    min={1}
                    value={maxBookingsPerInviteePeriodDays}
                    onChange={(e) => setMaxBookingsPerInviteePeriodDays(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="e.g. 30"
                    className="input-glass w-full"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-4">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Creating…" : "Create event type"}
            </button>
            <Link href="/bookings" className="btn-ghost">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
