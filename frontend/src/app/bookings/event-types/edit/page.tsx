"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { eventTypesApi, teamMembersApi, type EventType, type TeamMember } from "@/lib/api";

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

type OverrideRow = { id: number; override_date: string; is_available: boolean; start_time: string | null; end_time: string | null };
type MemberRow = { id: number; team_member_id: number; sort_order: number };
type VacationRow = { id: number; start_date: string; end_date: string; reason: string | null };
type QuestionRow = { id: number; sort_order: number; question_type: string; label: string; required: boolean; options: string[] | null; show_if: Record<string, unknown> | null };

export default function EditEventTypePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const id = typeof idParam === "string" && /^\d+$/.test(idParam) ? Number(idParam) : NaN;
  const [eventType, setEventType] = useState<EventType | null>(null);
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newOverrideDate, setNewOverrideDate] = useState("");
  const [newOverrideAvailable, setNewOverrideAvailable] = useState(false);
  const [newMemberId, setNewMemberId] = useState<number | "">("");
  const [showOverrides, setShowOverrides] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [vacationBlocks, setVacationBlocks] = useState<VacationRow[]>([]);
  const [showVacation, setShowVacation] = useState(false);
  const [newVacationStart, setNewVacationStart] = useState("");
  const [newVacationEnd, setNewVacationEnd] = useState("");
  const [newVacationReason, setNewVacationReason] = useState("");
  const [confirmationMode, setConfirmationMode] = useState<"instant" | "manual">("instant");
  const [sendCalendarInvite, setSendCalendarInvite] = useState(true);
  const [sendEmailConfirmation, setSendEmailConfirmation] = useState(true);
  const [sendSmsConfirmation, setSendSmsConfirmation] = useState(false);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [showQuestions, setShowQuestions] = useState(false);
  const [newQuestionType, setNewQuestionType] = useState<"text" | "dropdown" | "checkbox" | "radio">("text");
  const [newQuestionLabel, setNewQuestionLabel] = useState("");
  const [newQuestionRequired, setNewQuestionRequired] = useState(false);
  const [newQuestionOptions, setNewQuestionOptions] = useState("");

  useEffect(() => {
    if (!Number.isInteger(id) || id < 1) return;
    setLoading(true);
    setError(null);
    eventTypesApi
      .get(id)
      .then((et) => {
        setEventType(et);
        setName(et.name);
        setSlug(et.slug);
        setDurationMinutes(et.duration_minutes ?? 30);
        setDescription(et.description ?? "");
        setLocationType(et.location_type ?? "");
        setLocationLink(et.location_link ?? "");
        setBufferBefore(et.buffer_before_minutes ?? 0);
        setBufferAfter(et.buffer_after_minutes ?? 0);
        setMinimumNotice(et.minimum_notice_minutes ?? 0);
        setDateRangeStartDays(et.date_range_start_days ?? "");
        setDateRangeEndDays(et.date_range_end_days ?? "");
        setMaxBookingsPerDay(et.max_bookings_per_day ?? "");
        setMaxFutureBookings(et.max_future_bookings ?? "");
        setTimezone(et.timezone ?? "");
        setSlotCapacity(et.slot_capacity ?? 1);
        setMaxBookingsPerInvitee(et.max_bookings_per_invitee ?? "");
        setMaxBookingsPerInviteePeriodDays(et.max_bookings_per_invitee_period_days ?? "");
        setConfirmationMode((et.confirmation_mode === "manual" ? "manual" : "instant") as "instant" | "manual");
        setSendCalendarInvite(et.send_calendar_invite ?? true);
        setSendEmailConfirmation(et.send_email_confirmation ?? true);
        setSendSmsConfirmation(et.send_sms_confirmation ?? false);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!Number.isInteger(id) || id < 1) return;
    eventTypesApi.listOverrides(id).then(setOverrides).catch(() => setOverrides([]));
    eventTypesApi.listMembers(id).then(setMembers).catch(() => setMembers([]));
    eventTypesApi.listVacationBlocks(id).then(setVacationBlocks).catch(() => setVacationBlocks([]));
    eventTypesApi.listBookingQuestions(id).then(setQuestions).catch(() => setQuestions([]));
  }, [id]);

  useEffect(() => {
    teamMembersApi.list(0, 200).then(setTeamMembers).catch(() => setTeamMembers([]));
  }, []);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slug || slug === slugify(name)) setSlug(slugify(v));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim() || !Number.isInteger(id)) return;
    setSaving(true);
    setError(null);
    const body: Parameters<typeof eventTypesApi.update>[1] = {
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
      confirmation_mode: confirmationMode,
      send_calendar_invite: sendCalendarInvite,
      send_email_confirmation: sendEmailConfirmation,
      send_sms_confirmation: sendSmsConfirmation,
    };
    eventTypesApi
      .update(id, body)
      .then(() => router.push("/bookings"))
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to save");
        setSaving(false);
      });
  };

  const handleAddOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOverrideDate.trim()) return;
    eventTypesApi
      .createOverride(id, { override_date: newOverrideDate, is_available: newOverrideAvailable })
      .then((ov) => {
        setOverrides((prev) => [...prev, { id: ov.id, override_date: ov.override_date, is_available: ov.is_available, start_time: ov.start_time, end_time: ov.end_time }]);
        setNewOverrideDate("");
        setNewOverrideAvailable(false);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to add override"));
  };

  const handleRemoveOverride = (overrideId: number) => {
    eventTypesApi
      .deleteOverride(id, overrideId)
      .then(() => setOverrides((prev) => prev.filter((o) => o.id !== overrideId)))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to remove override"));
  };

  const handleAddVacation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVacationStart || !newVacationEnd) return;
    eventTypesApi
      .createVacationBlock(id, { start_date: newVacationStart, end_date: newVacationEnd, reason: newVacationReason.trim() || undefined })
      .then((vb) => {
        setVacationBlocks((prev) => [...prev, { id: vb.id, start_date: vb.start_date, end_date: vb.end_date, reason: vb.reason }]);
        setNewVacationStart("");
        setNewVacationEnd("");
        setNewVacationReason("");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to add vacation block"));
  };

  const handleRemoveVacation = (blockId: number) => {
    eventTypesApi
      .deleteVacationBlock(id, blockId)
      .then(() => setVacationBlocks((prev) => prev.filter((v) => v.id !== blockId)))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to remove vacation block"));
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionLabel.trim()) return;
    const options = newQuestionOptions.trim() ? newQuestionOptions.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
    eventTypesApi
      .createBookingQuestion(id, {
        question_type: newQuestionType,
        label: newQuestionLabel.trim(),
        required: newQuestionRequired,
        options: (newQuestionType === "dropdown" || newQuestionType === "radio") ? options : undefined,
      })
      .then((q) => {
        setQuestions((prev) => [...prev, { id: q.id, sort_order: prev.length, question_type: q.question_type, label: q.label, required: q.required, options: q.options ?? null, show_if: q.show_if ?? null }]);
        setNewQuestionLabel("");
        setNewQuestionRequired(false);
        setNewQuestionOptions("");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to add question"));
  };

  const handleRemoveQuestion = (questionId: number) => {
    eventTypesApi
      .deleteBookingQuestion(id, questionId)
      .then(() => setQuestions((prev) => prev.filter((q) => q.id !== questionId)))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to remove question"));
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMemberId === "" || typeof newMemberId !== "number") return;
    const sortOrder = members.length > 0 ? Math.max(...members.map((m) => m.sort_order)) + 1 : 0;
    eventTypesApi
      .addMember(id, { team_member_id: newMemberId, sort_order: sortOrder })
      .then((m) => {
        setMembers((prev) => [...prev, { id: m.id, team_member_id: m.team_member_id, sort_order: m.sort_order }]);
        setNewMemberId("");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to add member"));
  };

  const handleRemoveMember = (memberId: number) => {
    eventTypesApi
      .removeMember(id, memberId)
      .then(() => setMembers((prev) => prev.filter((m) => m.id !== memberId)))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to remove member"));
  };

  const teamMemberName = (tid: number) => teamMembers.find((t) => t.id === tid)?.name ?? `#${tid}`;

  if (!Number.isInteger(id) || id < 1) {
    return (
      <div className="page-root">
        <header className="page-header">
          <h1 className="page-title">Invalid event type</h1>
          <p className="page-subtitle">The event type ID in the URL is missing or invalid.</p>
        </header>
        <Link href="/bookings" className="btn-ghost">Back to Bookings</Link>
      </div>
    );
  }

  if (loading && !eventType) {
    return (
      <div className="page-root">
        <header className="page-header">
          <h1 className="page-title">Edit event type</h1>
        </header>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!eventType && !loading) {
    return (
      <div className="page-root">
        <header className="page-header">
          <h1 className="page-title">Event type not found</h1>
        </header>
        <Link href="/bookings" className="btn-ghost">Back to Bookings</Link>
      </div>
    );
  }

  return (
    <div className="page-root">
      <header className="page-header animate-in">
        <div>
          <Link href="/bookings" className="text-sm text-muted-dim hover:text-muted mb-1 inline-block transition-colors">
            ← Bookings
          </Link>
          <h1 className="page-title">Edit event type</h1>
          <p className="page-subtitle">Update settings, date overrides, and round robin members</p>
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
                    durationMinutes === m ? "bg-(--accent) text-on-accent" : "bg-(--surface-elevated) text-muted hover:bg-(--surface-hover)"
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
            className="text-sm font-medium text-(--accent) hover:underline"
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
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            <Link href="/bookings" className="btn-ghost">
              Cancel
            </Link>
          </div>
        </form>
      </div>

      <div className="section-card animate-in max-w-2xl mt-6">
        <button
          type="button"
          onClick={() => setShowOverrides(!showOverrides)}
          className="text-base font-semibold text-foreground flex items-center gap-2"
        >
          Date overrides
          <span className="text-sm font-normal text-muted-dim">({overrides.length})</span>
        </button>
        {showOverrides && (
          <div className="mt-4 space-y-4">
            <ul className="space-y-2">
              {overrides.map((ov) => (
                <li key={ov.id} className="flex items-center justify-between rounded-lg bg-(--surface-elevated)/50 px-3 py-2 text-sm">
                  <span>
                    {ov.override_date} — {ov.is_available ? "Available" : "Unavailable"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveOverride(ov.id)}
                    className="text-danger hover:opacity-80 text-sm"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <form onSubmit={handleAddOverride} className="flex flex-wrap items-end gap-2">
              <div>
                <label className="mb-1 block text-xs text-muted-dim">Date</label>
                <input
                  type="date"
                  value={newOverrideDate}
                  onChange={(e) => setNewOverrideDate(e.target.value)}
                  className="input-glass"
                  required
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={newOverrideAvailable}
                  onChange={(e) => setNewOverrideAvailable(e.target.checked)}
                />
                Available
              </label>
              <button type="submit" className="btn-primary text-sm py-2">Add override</button>
            </form>
          </div>
        )}
      </div>

      <div className="section-card animate-in max-w-2xl mt-6">
        <button
          type="button"
          onClick={() => setShowVacation(!showVacation)}
          className="text-base font-semibold text-foreground flex items-center gap-2"
        >
          Vacation blocks
          <span className="text-sm font-normal text-muted-dim">({vacationBlocks.length})</span>
        </button>
        {showVacation && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-dim">Dates when this event type is fully unavailable. No slots will be offered.</p>
            <ul className="space-y-2">
              {vacationBlocks.map((vb) => (
                <li key={vb.id} className="flex items-center justify-between rounded-lg bg-(--surface-elevated)/50 px-3 py-2 text-sm">
                  <span>
                    {vb.start_date} – {vb.end_date}
                    {vb.reason ? ` (${vb.reason})` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveVacation(vb.id)}
                    className="text-danger hover:opacity-80 text-sm"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <form onSubmit={handleAddVacation} className="flex flex-wrap items-end gap-2">
              <div>
                <label className="mb-1 block text-xs text-muted-dim">Start date</label>
                <input
                  type="date"
                  value={newVacationStart}
                  onChange={(e) => setNewVacationStart(e.target.value)}
                  className="input-glass"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-dim">End date</label>
                <input
                  type="date"
                  value={newVacationEnd}
                  onChange={(e) => setNewVacationEnd(e.target.value)}
                  className="input-glass"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-dim">Reason (optional)</label>
                <input
                  type="text"
                  value={newVacationReason}
                  onChange={(e) => setNewVacationReason(e.target.value)}
                  placeholder="e.g. Holiday"
                  className="input-glass min-w-[120px]"
                />
              </div>
              <button type="submit" className="btn-primary text-sm py-2">Add vacation</button>
            </form>
          </div>
        )}
      </div>

      <div className="section-card animate-in max-w-2xl mt-6">
        <button
          type="button"
          onClick={() => setShowMembers(!showMembers)}
          className="text-base font-semibold text-foreground flex items-center gap-2"
        >
          Round robin members
          <span className="text-sm font-normal text-muted-dim">({members.length})</span>
        </button>
        {showMembers && (
          <div className="mt-4 space-y-4">
            <ul className="space-y-2">
              {members.sort((a, b) => a.sort_order - b.sort_order).map((m) => (
                <li key={m.id} className="flex items-center justify-between rounded-lg bg-(--surface-elevated)/50 px-3 py-2 text-sm">
                  <span>{teamMemberName(m.team_member_id)} (order {m.sort_order})</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(m.id)}
                    className="text-danger hover:opacity-80 text-sm"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <form onSubmit={handleAddMember} className="flex flex-wrap items-end gap-2">
              <div>
                <label className="mb-1 block text-xs text-muted-dim">Team member</label>
                <select
                  value={newMemberId}
                  onChange={(e) => setNewMemberId(e.target.value === "" ? "" : Number(e.target.value))}
                  className="input-glass min-w-[160px]"
                >
                  <option value="">Select…</option>
                  {teamMembers
                    .filter((t) => !members.some((m) => m.team_member_id === t.id))
                    .map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
              </div>
              <button type="submit" className="btn-primary text-sm py-2" disabled={newMemberId === ""}>
                Add member
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
