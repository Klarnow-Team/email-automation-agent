"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { bookingsApi, calendarApi, eventTypesApi, teamMembersApi, type Booking, type CalendarConnection, type EventType, type TeamMember } from "@/lib/api";
import { AnimatedCounter } from "@/components/AnimatedCounter";

function toDateOnly(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function isSameDay(a: Date, b: Date): boolean {
  return toDateOnly(a).getTime() === toDateOnly(b).getTime();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
}

export default function BookingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [calendarConnections, setCalendarConnections] = useState<CalendarConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingEventTypeId, setDeletingEventTypeId] = useState<number | null>(null);
  const [deleteBookingConfirm, setDeleteBookingConfirm] = useState<Booking | null>(null);
  const [deleteEventTypeConfirm, setDeleteEventTypeConfirm] = useState<EventType | null>(null);
  const [slotsViewDate, setSlotsViewDate] = useState<Date>(() => toDateOnly(new Date()));
  const [dayBookings, setDayBookings] = useState<Booking[]>([]);
  const [showCalendarSync, setShowCalendarSync] = useState(false);
  const [calendarConnectPending, setCalendarConnectPending] = useState<number | null>(null);

  const eventTypeNameById = useMemo(() => {
    const map = new Map<number, string>();
    eventTypes.forEach((et) => map.set(et.id, et.name));
    return map;
  }, [eventTypes]);

  const load = () => {
    setLoading(true);
    Promise.all([bookingsApi.list({ limit: 100 }), eventTypesApi.list(0, 100), teamMembersApi.list(0, 200), calendarApi.listConnections()])
      .then(([b, et, tm, conns]) => {
        setBookings(b);
        setEventTypes(et);
        setTeamMembers(tm);
        setCalendarConnections(conns);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const calendarConnected = searchParams.get("calendar_connected");
  const calendarError = searchParams.get("calendar_error");
  useEffect(() => {
    if (calendarConnected === "1") setError(null);
    if (calendarError) setError(`Calendar: ${calendarError}`);
  }, [calendarConnected, calendarError]);

  const connectionsByMember = useMemo(() => {
    const m = new Map<number, CalendarConnection[]>();
    calendarConnections.forEach((c) => {
      const list = m.get(c.team_member_id) ?? [];
      list.push(c);
      m.set(c.team_member_id, list);
    });
    return m;
  }, [calendarConnections]);

  const handleConnectCalendar = (teamMemberId: number) => {
    setCalendarConnectPending(teamMemberId);
    calendarApi
      .startConnect({ team_member_id: teamMemberId, provider: "google" })
      .then(({ auth_url }) => {
        window.location.href = auth_url;
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to start calendar connect");
        setCalendarConnectPending(null);
      });
  };

  const handleDisconnectCalendar = (connectionId: number) => {
    calendarApi
      .disconnect(connectionId)
      .then(() => setCalendarConnections((prev) => prev.filter((c) => c.id !== connectionId)))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to disconnect"));
  };

  useEffect(() => {
    const from = new Date(slotsViewDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(slotsViewDate);
    to.setHours(23, 59, 59, 999);
    bookingsApi
      .list({ from: from.toISOString(), to: to.toISOString(), limit: 100 })
      .then(setDayBookings)
      .catch(() => setDayBookings([]));
  }, [slotsViewDate]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });

  const handleDeleteBookingConfirm = () => {
    if (!deleteBookingConfirm) return;
    const b = deleteBookingConfirm;
    setDeletingId(b.id);
    setError(null);
    bookingsApi
      .delete(b.id)
      .then(() => {
        setDeleteBookingConfirm(null);
        setBookings((prev) => prev.filter((x) => x.id !== b.id));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to delete booking"))
      .finally(() => setDeletingId(null));
  };

  const handleDeleteEventTypeConfirm = () => {
    if (!deleteEventTypeConfirm) return;
    const et = deleteEventTypeConfirm;
    setDeletingEventTypeId(et.id);
    setError(null);
    eventTypesApi
      .delete(et.id)
      .then(() => {
        setDeleteEventTypeConfirm(null);
        setEventTypes((prev) => prev.filter((x) => x.id !== et.id));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to delete event type"))
      .finally(() => setDeletingEventTypeId(null));
  };

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDeleteBookingConfirm(null);
        setDeleteEventTypeConfirm(null);
      }
    };
    const open = deleteBookingConfirm || deleteEventTypeConfirm;
    if (open) {
      document.addEventListener("keydown", onEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onEscape);
      if (open) document.body.style.overflow = "";
    };
  }, [deleteBookingConfirm, deleteEventTypeConfirm]);

  const goSlotsPrevDay = () => {
    setSlotsViewDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() - 1);
      return next;
    });
  };
  const goSlotsNextDay = () => {
    setSlotsViewDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      return next;
    });
  };
  const isSlotsViewToday = isSameDay(slotsViewDate, new Date());
  const slotsViewDateLabel = slotsViewDate.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const upcoming = bookings.filter(
    (b) =>
      new Date(b.start_at) > new Date() &&
      (b.status === "confirmed" || b.status === "pending_confirmation")
  ).length;

  const BOOKING_PAGE_SIZE = 10;
  const totalBookingPages = Math.max(1, Math.ceil(bookings.length / BOOKING_PAGE_SIZE));
  const [bookingPage, setBookingPage] = useState(0);
  const paginatedBookings = useMemo(
    () => bookings.slice(bookingPage * BOOKING_PAGE_SIZE, bookingPage * BOOKING_PAGE_SIZE + BOOKING_PAGE_SIZE),
    [bookings, bookingPage],
  );
  useEffect(() => {
    setBookingPage((p) => Math.min(p, Math.max(0, totalBookingPages - 1)));
  }, [totalBookingPages]);

  if (loading && !bookings.length && !eventTypes.length) {
    return (
      <div className="page-root">
        <header className="page-header">
          <h1 className="page-title">Bookings</h1>
        </header>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-root bookings-page">
      <header className="page-header animate-in">
        <div>
          <h1 className="page-title">Bookings</h1>
          <p className="page-subtitle">Manage event types, availability, and bookings</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/bookings/event-types/new" className="btn-primary">
            Create event type
          </Link>
          <Link href="/bookings/availability" className="btn-ghost">
            Edit availability
          </Link>
          <Link href="/book" className="btn-ghost">
            Preview client booking
          </Link>
          <Link href="/profile" className="btn-ghost">
            Profile
          </Link>
        </div>
      </header>

      {/* How bookings work */}
      <section className="rounded-xl border border-(--card-border) bg-(--card-bg-subtle) p-4 mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-2">How bookings work</h2>
        <ul className="text-sm text-muted space-y-1 list-disc list-inside">
          <li><strong className="text-foreground">Event types</strong> — Define bookable sessions (e.g. 30 min call). Set duration, slug, and weekly availability.</li>
          <li><strong className="text-foreground">Availability</strong> — Choose when each event type is offered. Connect Google Calendar to block busy times.</li>
          <li><strong className="text-foreground">Bookings</strong> — Customers pick a slot; bookings appear here. Confirm or cancel as needed.</li>
        </ul>
        <p className="text-xs text-muted-dim mt-3 pt-3 border-t border-(--card-border)">
          Use &quot;Booked slots for the day&quot; to see what’s taken. Delete a booking to free the slot; delete an event type to remove it entirely.
        </p>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="dash-kpi-card">
          <p className="dash-kpi-value text-foreground"><AnimatedCounter value={eventTypes.length} /></p>
          <p className="dash-kpi-label">Event types</p>
        </div>
        <div className="dash-kpi-card">
          <p className="dash-kpi-value text-foreground"><AnimatedCounter value={bookings.length} /></p>
          <p className="dash-kpi-label">Total bookings</p>
        </div>
        <div className="dash-kpi-card">
          <p className="dash-kpi-value text-success"><AnimatedCounter value={upcoming} /></p>
          <p className="dash-kpi-label">Upcoming</p>
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

      {/* Delete booking confirm modal */}
      {deleteBookingConfirm && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setDeleteBookingConfirm(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-booking-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="delete-booking-title" className="modal-title">Delete booking</h2>
              <button type="button" onClick={() => setDeleteBookingConfirm(null)} className="modal-close" aria-label="Close">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="text-muted">
                Delete this booking ({deleteBookingConfirm.title ?? "Untitled"}) on {formatDate(deleteBookingConfirm.start_at)}? This cannot be undone. The slot will become available again.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setDeleteBookingConfirm(null)} className="btn-ghost">Cancel</button>
              <button type="button" onClick={handleDeleteBookingConfirm} className="btn-danger disabled:opacity-50" disabled={deletingId !== null}>
                {deletingId !== null ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete event type confirm modal */}
      {deleteEventTypeConfirm && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setDeleteEventTypeConfirm(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-event-type-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="delete-event-type-title" className="modal-title">Delete event type</h2>
              <button type="button" onClick={() => setDeleteEventTypeConfirm(null)} className="modal-close" aria-label="Close">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="text-muted">
                Delete event type <strong className="text-foreground">{deleteEventTypeConfirm.name}</strong>? Its availability and any linked data will be removed. This cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setDeleteEventTypeConfirm(null)} className="btn-ghost">Cancel</button>
              <button type="button" onClick={handleDeleteEventTypeConfirm} className="btn-danger disabled:opacity-50" disabled={deletingEventTypeId !== null}>
                {deletingEventTypeId !== null ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="section-card animate-in max-w-2xl mb-6 border border-(--card-border) rounded-xl">
        <button
          type="button"
          onClick={() => setShowCalendarSync(!showCalendarSync)}
          className="text-base font-semibold text-foreground flex items-center gap-2"
        >
          Calendar sync
          <span className="text-sm font-normal text-muted-dim">(block busy times from Google Calendar)</span>
        </button>
        {showCalendarSync && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-dim">
              Connect a team member’s Google Calendar so their busy times are excluded from available slots.
            </p>
            {teamMembers.length === 0 ? (
              <p className="text-sm text-muted-dim">Add team members in event type settings (round robin) first.</p>
            ) : (
              <ul className="space-y-3">
                {teamMembers.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-(--surface-elevated)/50 px-3 py-2 text-sm">
                    <span className="font-medium">{m.name}</span>
                    <div className="flex items-center gap-2">
                      {(connectionsByMember.get(m.id) ?? []).map((c) => (
                        <span key={c.id} className="inline-flex items-center gap-1 rounded bg-(--surface)/80 px-2 py-1 text-xs">
                          {c.provider === "google" && "Google"}
                          {c.email ? ` (${c.email})` : ""}
                          <button
                            type="button"
                            onClick={() => handleDisconnectCalendar(c.id)}
                            className="text-danger hover:opacity-80 ml-1"
                            aria-label="Disconnect"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleConnectCalendar(m.id)}
                        disabled={calendarConnectPending !== null}
                        className="btn-primary text-xs py-1.5 px-2"
                      >
                        {calendarConnectPending === m.id ? "Redirecting…" : "Connect Google Calendar"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <section className="section-card space-y-4">
        <h2 className="section-title mb-0">Booked slots for the day</h2>
        <p className="text-sm text-muted-dim -mt-1">
          These times are taken for all event types. Use the calendar to set availability.
        </p>
        <div className="rounded-xl border border-(--card-border) bg-(--surface) overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-(--card-border) bg-(--surface-elevated)/50">
            <button
              type="button"
              onClick={goSlotsPrevDay}
              className="rounded-lg border border-(--card-border) bg-(--surface) px-3 py-2 text-sm text-muted hover:bg-(--surface-hover) transition-colors"
              aria-label="Previous day"
            >
              ← Prev
            </button>
            <span className={`text-sm font-semibold tabular-nums min-w-[12rem] text-center ${isSlotsViewToday ? "text-(--accent)" : "text-foreground"}`}>
              {slotsViewDateLabel}
              {isSlotsViewToday && (
                <span className="ml-2 inline-block rounded-full bg-(--accent)/20 px-2 py-0.5 text-xs font-medium text-(--accent)">
                  Today
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={goSlotsNextDay}
              className="rounded-lg border border-(--card-border) bg-(--surface) px-3 py-2 text-sm text-muted hover:bg-(--surface-hover) transition-colors"
              aria-label="Next day"
            >
              Next →
            </button>
          </div>
          <div className="p-4 min-h-[4rem]">
            {dayBookings.length === 0 ? (
              <p className="text-sm text-muted-dim py-2">No bookings on this day.</p>
            ) : (
              <ul className="space-y-2">
                {[...dayBookings]
                  .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
                  .map((b) => (
                    <li
                      key={b.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-(--surface-elevated)/50 border border-(--card-border) px-3 py-2 text-sm"
                    >
                      <span className="font-medium tabular-nums text-foreground">
                        {formatTime(b.start_at)}
                      </span>
                      <span className="text-muted">·</span>
                      <span className="text-muted">
                        {eventTypeNameById.get(b.event_type_id) ?? `Event type #${b.event_type_id}`}
                      </span>
                      {b.attendee_name || b.attendee_email ? (
                        <>
                          <span className="text-muted-dim hidden sm:inline">·</span>
                          <span className="text-muted-dim truncate">
                            {b.attendee_name || b.attendee_email}
                          </span>
                        </>
                      ) : null}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="section-card space-y-4 mt-8">
        <h2 className="section-title mb-0">Your event types</h2>
        <p className="text-sm text-muted-dim -mt-1">
          Set weekly availability per type. The calendar shows <span className="text-red-400/90 font-medium">red [Taken]</span> for slots already booked.
        </p>
        {eventTypes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {eventTypes.map((et) => (
              <article
                key={et.id}
                className="group relative rounded-xl border border-(--card-border) bg-(--surface) overflow-hidden transition-all duration-300 hover:border-(--card-border) hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-(--accent)/[0.04] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" aria-hidden />
                <div className="relative p-5 sm:p-6 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--accent)/10 text-(--accent) ring-1 ring-(--accent)/20">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-foreground tracking-tight truncate">
                          {et.name}
                        </h3>
                        <p className="mt-0.5 font-mono text-xs text-muted-dim truncate">/{et.slug}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteEventTypeConfirm(et)}
                      disabled={deletingEventTypeId === et.id}
                      className="shrink-0 rounded-lg p-2 text-muted hover:text-danger hover:bg-(--danger-muted) disabled:opacity-50 transition-colors duration-200 -m-1"
                      title="Delete event type"
                      aria-label="Delete event type"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-(--surface-elevated)/80 px-2.5 py-1 text-xs font-medium text-muted tabular-nums ring-1 ring-(--card-border)">
                      {et.duration_minutes} min
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => router.push(`/bookings/event-types/edit?id=${et.id}`)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-(--card-border) bg-(--surface-elevated) px-4 py-2.5 text-sm font-medium text-muted hover:bg-(--surface-hover) transition-colors"
                    >
                      Edit
                    </button>
                    <Link
                      href={`/bookings/availability?event_type=${et.id}`}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-(--accent) px-4 py-2.5 text-sm font-medium text-on-accent shadow-sm transition-all duration-200 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-(--accent) focus:ring-offset-2 focus:ring-offset-(--surface)"
                    >
                      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Set availability
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state-centered">
            <div className="empty-state-icon" aria-hidden>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="font-semibold text-foreground">No event types yet</p>
            <p className="text-sm text-muted-dim mt-1">Create one to start taking bookings.</p>
            <Link href="/bookings/event-types/new" className="btn-primary mt-4">
              Create event type
            </Link>
          </div>
        )}
      </section>

      <section className="section-card mt-8">
        <h2 className="section-title mb-0">Your bookings</h2>
        <p className="text-sm text-muted-dim mt-1 mb-4">
          Recent and upcoming bookings. Delete to free the slot.
        </p>
        {bookings.length > 0 ? (
          <>
            <div className="space-y-4">
              {paginatedBookings.map((b) => (
                <div key={b.id} className="rounded-xl border border-(--card-border) bg-(--surface) p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="list-card-title mb-0">{b.title ?? "Untitled"}</p>
                      <p className="text-sm text-muted-dim mt-1 tabular-nums">
                        {formatDate(b.start_at)}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`badge text-xs ${b.status === "confirmed" ? "badge-sent" : "badge-draft"}`}>
                          {b.status.replace(/_/g, " ")}
                        </span>
                        <span className="text-sm text-muted-dim">
                          {eventTypeNameById.get(b.event_type_id) ?? `Event type #${b.event_type_id}`}
                        </span>
                        {(b.attendee_email ?? b.attendee_name) && (
                          <span className="text-sm text-muted-dim truncate">
                            · {b.attendee_name ?? b.attendee_email}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setDeleteBookingConfirm(b)}
                        disabled={deletingId === b.id}
                        className="btn-danger text-sm py-1.5 px-2.5 disabled:opacity-50"
                        title="Delete booking"
                      >
                        {deletingId === b.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <nav className="dash-pagination mt-4" aria-label="Bookings pagination">
              <button
                type="button"
                className="dash-pagination-btn"
                disabled={bookingPage === 0}
                onClick={() => setBookingPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </button>
              <span className="dash-pagination-info">
                Page {bookingPage + 1} of {totalBookingPages}
              </span>
              <button
                type="button"
                className="dash-pagination-btn"
                disabled={bookingPage >= totalBookingPages - 1}
                onClick={() => setBookingPage((p) => Math.min(totalBookingPages - 1, p + 1))}
              >
                Next
              </button>
            </nav>
          </>
        ) : (
          <div className="empty-state-centered">
            <div className="empty-state-icon" aria-hidden>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-semibold text-foreground">No bookings yet</p>
            <p className="text-sm text-muted-dim mt-1">Bookings will appear here once created.</p>
          </div>
        )}
      </section>
    </div>
  );
}
