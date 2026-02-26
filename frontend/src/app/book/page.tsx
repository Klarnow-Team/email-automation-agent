"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  publicBookingApi,
  eventTypesApi,
  type PublicEventType,
} from "@/lib/api";

type Step = "event" | "datetime" | "details" | "done";

const STEPS: { id: Step; label: string }[] = [
  { id: "event", label: "Event type" },
  { id: "datetime", label: "Date & time" },
  { id: "details", label: "Your details" },
  { id: "done", label: "Confirm" },
];

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function stepIndex(step: Step): number {
  const i = STEPS.findIndex((s) => s.id === step);
  return i >= 0 ? i : 0;
}

export default function BookPage() {
  const searchParams = useSearchParams();
  const slugFromUrl = searchParams.get("slug") ?? "";

  const [step, setStep] = useState<Step>("event");
  const [slug, setSlug] = useState(slugFromUrl);
  const [eventTypes, setEventTypes] = useState<Array<{ id: number; name: string; slug: string }>>([]);
  const [eventType, setEventType] = useState<PublicEventType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dateRangeStart] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [dateRangeEnd] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 13);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [slots, setSlots] = useState<Array<{ start: string; end: string }>>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);

  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [attendeePhone, setAttendeePhone] = useState("");
  const [formResponses, setFormResponses] = useState<Record<string, unknown>>({});
  const [gdprConsent, setGdprConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    title: string;
    start_at: string;
    end_at: string;
    status: string;
    confirmation_mode: string;
    ics: string;
  } | null>(null);

  useEffect(() => {
    eventTypesApi
      .list(0, 100)
      .then((list) =>
        setEventTypes(list.map((et) => ({ id: et.id, name: et.name, slug: et.slug })))
      )
      .catch(() => setEventTypes([]));
  }, []);

  useEffect(() => {
    if (!slugFromUrl) return;
    setSlug(slugFromUrl);
    setLoading(true);
    setError(null);
    publicBookingApi
      .getEventTypeBySlug(slugFromUrl)
      .then((et) => {
        setEventType(et);
        setStep("datetime");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Event type not found"))
      .finally(() => setLoading(false));
  }, [slugFromUrl]);

  const loadEventType = () => {
    const s = slug.trim().toLowerCase();
    if (!s) {
      setError("Enter an event type slug (e.g. 30min-call)");
      return;
    }
    setLoading(true);
    setError(null);
    publicBookingApi
      .getEventTypeBySlug(s)
      .then((et) => {
        setEventType(et);
        setStep("datetime");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Event type not found"))
      .finally(() => setLoading(false));
  };

  const selectEventTypeBySlug = (etSlug: string) => {
    setSlug(etSlug);
    setLoading(true);
    setError(null);
    publicBookingApi
      .getEventTypeBySlug(etSlug)
      .then((e) => {
        setEventType(e);
        setStep("datetime");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Not found"))
      .finally(() => setLoading(false));
  };

  const datesToShow = useMemo(() => {
    const out: Date[] = [];
    const start = new Date(dateRangeStart);
    const end = new Date(dateRangeEnd);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      out.push(new Date(d));
    }
    return out;
  }, [dateRangeStart, dateRangeEnd]);

  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return slots.filter((s) => s.start.startsWith(selectedDate));
  }, [slots, selectedDate]);

  const fetchSlots = () => {
    if (!eventType) return;
    setSlotsLoading(true);
    const from = toDateString(dateRangeStart);
    const to = toDateString(dateRangeEnd);
    publicBookingApi
      .getAvailableSlots(eventType.id, from, to)
      .then((res) => setSlots(res.slots ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load slots"))
      .finally(() => setSlotsLoading(false));
  };

  useEffect(() => {
    if (step === "datetime" && eventType) fetchSlots();
  }, [step, eventType?.id, dateRangeStart, dateRangeEnd]);

  const chooseDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedSlot(null);
  };

  const chooseSlot = (slot: { start: string; end: string }) => {
    setSelectedSlot(slot);
    setStep("details");
  };

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventType || !selectedSlot) return;
    if (!attendeeName.trim() || !attendeeEmail.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (!gdprConsent) {
      setError("Please accept the privacy terms.");
      return;
    }
    setSubmitting(true);
    setError(null);
    publicBookingApi
      .createBooking({
        event_type_id: eventType.id,
        start_at: selectedSlot.start,
        end_at: selectedSlot.end,
        attendee_name: attendeeName.trim(),
        attendee_email: attendeeEmail.trim(),
        attendee_phone: attendeePhone.trim() || undefined,
        form_responses: Object.keys(formResponses).length ? formResponses : undefined,
        gdpr_consent: gdprConsent,
      })
      .then((res) => {
        setBookingResult({
          title: res.title,
          start_at: res.start_at,
          end_at: res.end_at,
          status: res.status,
          confirmation_mode: res.confirmation_mode,
          ics: res.ics,
        });
        setStep("done");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Booking failed"))
      .finally(() => setSubmitting(false));
  };

  const visibleQuestions = useMemo(() => {
    if (!eventType?.questions) return [];
    return eventType.questions.filter((q) => {
      const showIf = q.show_if;
      if (!showIf || showIf.question_id == null) return true;
      const val = formResponses[String(showIf.question_id)] ?? formResponses[showIf.question_id];
      return val === showIf.value;
    });
  }, [eventType?.questions, formResponses]);

  const currentStepIndex = stepIndex(step);
  const showSummary = eventType && step !== "done";

  const resetBooking = () => {
    setStep("event");
    setEventType(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setAttendeeName("");
    setAttendeeEmail("");
    setAttendeePhone("");
    setFormResponses({});
    setGdprConsent(false);
    setBookingResult(null);
  };

  return (
    <div className="page-root book-page">
      <header className="page-header animate-in">
        <div>
          <h1 className="page-title">Book a meeting</h1>
          <p className="page-subtitle">
            Choose an event type, pick a time, and enter your details.
          </p>
        </div>
        <Link href="/bookings" className="btn-ghost">
          Back to Bookings
        </Link>
      </header>

      {/* Step progress */}
      {step !== "done" && (
        <nav aria-label="Booking steps" className="mb-6 animate-in">
          <ol className="flex flex-wrap items-center gap-2 sm:gap-0">
            {STEPS.filter((s) => s.id !== "done").map((s, i) => {
              const idx = stepIndex(s.id);
              const isActive = currentStepIndex === idx;
              const isPast = currentStepIndex > idx;
              const isClickable = isPast || s.id === "event";
              return (
                <li key={s.id} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (s.id === "event") {
                        setStep("event");
                      } else if (s.id === "datetime" && eventType) {
                        setStep("datetime");
                      } else if (s.id === "details" && eventType && selectedSlot) {
                        setStep("details");
                      }
                    }}
                    disabled={!isClickable}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--surface) ${
                      isActive
                        ? "bg-(--accent) text-on-accent"
                        : isPast
                          ? "bg-(--card-bg-subtle) text-muted hover:bg-(--surface-hover) disabled:opacity-70"
                          : "bg-(--card-bg-subtle) text-muted-dim"
                    } ${!isClickable ? "cursor-default" : ""}`}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold bg-white/20">
                      {i + 1}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {i < STEPS.length - 2 && (
                    <span
                      className={`mx-1 h-px w-4 sm:w-6 shrink-0 ${
                        isPast ? "bg-(--card-border)" : "bg-(--card-border) opacity-50"
                      }`}
                      aria-hidden
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {error && (
        <div className="alert-error animate-in mb-6">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="alert-dismiss" aria-label="Dismiss">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-8">
        {/* Summary sidebar */}
        {showSummary && (
          <aside className="order-2 lg:order-1 animate-in">
            <div className="rounded-xl border border-(--card-border) bg-(--card-bg-subtle) p-4 sticky top-24">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-dim mb-3">
                Booking summary
              </h2>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-muted-dim">Event</dt>
                  <dd className="font-medium text-foreground">{eventType.name}</dd>
                  <dd className="text-muted-dim">
                    {eventType.duration_minutes} min
                    {eventType.location_display ? ` · ${eventType.location_display}` : ""}
                  </dd>
                </div>
                {selectedDate && (
                  <div>
                    <dt className="text-muted-dim">Date</dt>
                    <dd className="text-foreground">
                      {formatDate(slotsForSelectedDate[0]?.start ?? selectedDate)}
                    </dd>
                  </div>
                )}
                {selectedSlot && (
                  <div>
                    <dt className="text-muted-dim">Time</dt>
                    <dd className="text-foreground">{formatTime(selectedSlot.start)}</dd>
                  </div>
                )}
              </dl>
              {step === "datetime" && selectedDate && !selectedSlot && (
                <p className="text-xs text-muted-dim mt-3 pt-3 border-t border-(--card-border)">
                  Select a time in the main area →
                </p>
              )}
              {step === "details" && (
                <button
                  type="button"
                  onClick={() => setStep("datetime")}
                  className="btn-ghost text-xs mt-3"
                >
                  Change date or time
                </button>
              )}
            </div>
          </aside>
        )}

        {/* Main step content */}
        <div className={`min-w-0 ${showSummary ? "order-1 lg:order-2" : "lg:col-span-2"}`}>
          {step === "event" && (
            <section className="section-card animate-in">
              <h2 className="section-title">Choose event type</h2>
              <p className="text-sm text-muted-dim mb-4">
                Enter the event type slug or pick one from your event types.
              </p>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-40">
                  <label className="field-label">Slug</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadEventType()}
                    placeholder="e.g. 30min-call"
                    className="input-glass w-full"
                  />
                </div>
                <button
                  type="button"
                  onClick={loadEventType}
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? "Loading…" : "Continue"}
                </button>
              </div>
              {eventTypes.length > 0 && (
                <div className="mt-5 pt-5 border-t border-(--card-border)">
                  <p className="text-xs text-muted-dim mb-2">Or select an event type</p>
                  <div className="flex flex-wrap gap-2">
                    {eventTypes.map((et) => (
                      <button
                        key={et.id}
                        type="button"
                        onClick={() => selectEventTypeBySlug(et.slug)}
                        disabled={loading}
                        className="btn-ghost text-sm"
                      >
                        {et.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {step === "datetime" && eventType && (
            <section className="section-card animate-in">
              <h2 className="section-title">Date & time</h2>
              <p className="text-sm text-muted-dim mb-5">
                {eventType.description || "Select a date, then choose a time slot."}
              </p>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3">Select a date</h3>
                  {slotsLoading ? (
                    <div className="flex items-center gap-2 py-6">
                      <div className="spinner" />
                      <span className="text-sm text-muted">Loading availability…</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {datesToShow.map((d) => {
                        const dateStr = toDateString(d);
                        const hasSlots = slots.some((s) => s.start.startsWith(dateStr));
                        const isSelected = selectedDate === dateStr;
                        return (
                          <button
                            key={dateStr}
                            type="button"
                            onClick={() => hasSlots && chooseDate(dateStr)}
                            disabled={!hasSlots}
                            className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                              isSelected
                                ? "border-(--accent) bg-(--accent)/10 text-foreground ring-1 ring-(--accent)"
                                : hasSlots
                                  ? "border-(--card-border) bg-(--surface-elevated) hover:bg-(--surface-hover) text-foreground"
                                  : "border-(--card-border) bg-(--card-bg-subtle) text-muted-dim cursor-not-allowed"
                            }`}
                          >
                            {d.toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                            {!hasSlots && " — No slots"}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedDate && slotsForSelectedDate.length > 0 && (
                  <div className="pt-4 border-t border-(--card-border)">
                    <h3 className="text-sm font-medium text-foreground mb-3">Select a time</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {slotsForSelectedDate.map((slot) => (
                        <button
                          key={slot.start}
                          type="button"
                          onClick={() => chooseSlot(slot)}
                          className="rounded-xl border border-(--card-border) bg-(--surface-elevated) px-3 py-2.5 text-sm text-foreground hover:bg-(--surface-hover) hover:border-(--accent)/50 transition-colors"
                        >
                          {formatTime(slot.start)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setStep("event")}
                  className="btn-ghost text-sm"
                >
                  ← Change event type
                </button>
              </div>
            </section>
          )}

          {step === "details" && eventType && selectedSlot && (
            <form onSubmit={handleSubmitBooking} className="section-card animate-in">
              <h2 className="section-title">Your details</h2>
              <p className="text-sm text-muted-dim mb-6">
                Enter your name and email to confirm the booking.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="field-label">Name *</label>
                  <input
                    type="text"
                    value={attendeeName}
                    onChange={(e) => setAttendeeName(e.target.value)}
                    required
                    className="input-glass w-full"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="field-label">Email *</label>
                  <input
                    type="email"
                    value={attendeeEmail}
                    onChange={(e) => setAttendeeEmail(e.target.value)}
                    required
                    className="input-glass w-full"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="field-label">Phone</label>
                  <input
                    type="tel"
                    value={attendeePhone}
                    onChange={(e) => setAttendeePhone(e.target.value)}
                    className="input-glass w-full"
                    placeholder="Optional"
                  />
                </div>
                {visibleQuestions.map((q) => (
                  <div key={q.id}>
                    <label className="field-label">
                      {q.label}
                      {q.required && " *"}
                    </label>
                    {q.question_type === "textarea" ? (
                      <textarea
                        value={(formResponses[q.id] as string) ?? ""}
                        onChange={(e) =>
                          setFormResponses((r) => ({ ...r, [q.id]: e.target.value }))
                        }
                        required={q.required}
                        className="input-glass w-full resize-y min-h-20"
                      />
                    ) : Array.isArray(q.options) && q.options.length > 0 ? (
                      <select
                        value={(formResponses[q.id] as string) ?? ""}
                        onChange={(e) =>
                          setFormResponses((r) => ({ ...r, [q.id]: e.target.value }))
                        }
                        required={q.required}
                        className="input-glass w-full"
                      >
                        <option value="">Select…</option>
                        {q.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={(formResponses[q.id] as string) ?? ""}
                        onChange={(e) =>
                          setFormResponses((r) => ({ ...r, [q.id]: e.target.value }))
                        }
                        required={q.required}
                        className="input-glass w-full"
                      />
                    )}
                  </div>
                ))}
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={gdprConsent}
                    onChange={(e) => setGdprConsent(e.target.checked)}
                    className="rounded border-(--card-border) bg-(--surface-elevated) text-(--accent) focus:ring-2 focus:ring-(--accent) focus:ring-offset-0"
                  />
                  <span className="text-sm text-muted group-hover:text-muted transition-colors">
                    I agree to the privacy policy and terms. *
                  </span>
                </label>
              </div>
              <div className="flex flex-wrap gap-3 mt-6">
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Booking…" : "Confirm booking"}
                </button>
                <button type="button" onClick={() => setStep("datetime")} className="btn-ghost">
                  ← Back to date & time
                </button>
              </div>
            </form>
          )}

          {step === "done" && bookingResult && (
            <section className="section-card animate-in">
              <h2 className="section-title text-success">Booking confirmed</h2>
              <p className="text-sm text-muted mb-4">
                {bookingResult.confirmation_mode === "instant"
                  ? "Your meeting is confirmed."
                  : "Your request has been sent. You'll receive a confirmation once it's approved."}
              </p>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-muted-dim">Meeting</dt>
                  <dd className="text-foreground font-medium">{bookingResult.title}</dd>
                </div>
                <div>
                  <dt className="text-muted-dim">When</dt>
                  <dd className="text-foreground">
                    {formatDate(bookingResult.start_at)} at {formatTime(bookingResult.start_at)}
                  </dd>
                </div>
              </dl>
              {bookingResult.ics && (
                <div className="mt-4 pt-4 border-t border-(--card-border)">
                  <a
                    href={`data:text/calendar;charset=utf-8,${encodeURIComponent(bookingResult.ics)}`}
                    download="invite.ics"
                    className="btn-ghost text-sm"
                  >
                    Add to calendar (.ics)
                  </a>
                </div>
              )}
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={resetBooking} className="btn-primary">
                  Book another
                </button>
                <Link href="/bookings" className="btn-ghost">
                  Back to Bookings
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
