"use client";

import React, { Suspense, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { eventTypesApi, bookingsApi, type EventType, type Booking } from "@/lib/api";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const START_HOUR = 7;
const END_HOUR = 20;
const STEP_MINUTES = 30;

type Slot = { day_of_week: number; start_time: string; end_time: string };

function rowToTime(r: number): string {
  const totalMins = START_HOUR * 60 + r * STEP_MINUTES;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function formatTimeLabel(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const min = mStr ?? "00";
  if (h === 0) return `12:${min} AM`;
  if (h < 12) return `${h}:${min} AM`;
  if (h === 12) return `12:${min} PM`;
  return `${h - 12}:${min} PM`;
}

function timeToRow(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  const totalMins = h * 60 + (m || 0);
  const startMins = START_HOUR * 60;
  const row = Math.floor((totalMins - startMins) / STEP_MINUTES);
  return Math.max(0, Math.min(row, ROW_COUNT - 1));
}

const ROW_COUNT = ((END_HOUR - START_HOUR) * 60) / STEP_MINUTES;

function toDateKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function timeToRowFromDate(d: Date): number {
  const totalMins = d.getHours() * 60 + d.getMinutes();
  const startMins = START_HOUR * 60;
  const row = Math.floor((totalMins - startMins) / STEP_MINUTES);
  return Math.max(0, Math.min(row, ROW_COUNT - 1));
}

function buildBookedSet(bookings: Booking[]): Set<string> {
  const set = new Set<string>();
  for (const b of bookings) {
    if (!b.start_at || !b.end_at) continue;
    let t = new Date(b.start_at);
    const end = new Date(b.end_at);
    while (t < end) {
      const dateKey = toDateKeyLocal(t);
      const row = timeToRowFromDate(t);
      set.add(`${dateKey}-${row}`);
      t = new Date(t.getTime() + STEP_MINUTES * 60 * 1000);
    }
  }
  return set;
}

function slotsToGrid(slots: Slot[]): boolean[][] {
  const grid: boolean[][] = Array.from({ length: 7 }, () => Array(ROW_COUNT).fill(false));
  for (const s of slots) {
    const startRow = timeToRow(s.start_time);
    const endRow = timeToRow(s.end_time);
    for (let r = startRow; r < endRow; r++) {
      grid[s.day_of_week][r] = true;
    }
  }
  return grid;
}

function gridToSlots(grid: boolean[][]): Slot[] {
  const slots: Slot[] = [];
  for (let d = 0; d < 7; d++) {
    let r = 0;
    while (r < ROW_COUNT) {
      if (grid[d][r]) {
        const start = r;
        while (r < ROW_COUNT && grid[d][r]) r++;
        slots.push({
          day_of_week: d,
          start_time: rowToTime(start),
          end_time: rowToTime(r),
        });
      } else {
        r++;
      }
    }
  }
  return slots;
}

function AvailabilityContent() {
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("event_type");
  const router = useRouter();
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(
    preselectedId ? Number(preselectedId) : null
  );
  const [grid, setGrid] = useState<boolean[][]>(
    () => Array.from({ length: 7 }, () => Array(ROW_COUNT).fill(false))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekBookings, setWeekBookings] = useState<Booking[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const bookedSet = useMemo(() => buildBookedSet(weekBookings), [weekBookings]);

  useEffect(() => {
    eventTypesApi
      .list(0, 100)
      .then(setEventTypes)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setGrid(Array.from({ length: 7 }, () => Array(ROW_COUNT).fill(false)));
      return;
    }
    eventTypesApi
      .getAvailability(selectedId)
      .then((list) => {
        const slots: Slot[] = list.map((s) => ({
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
        }));
        setGrid(slotsToGrid(slots));
      })
      .catch(() => setGrid(Array.from({ length: 7 }, () => Array(ROW_COUNT).fill(false))));
  }, [selectedId]);

  useEffect(() => {
    const from = new Date(weekStart);
    from.setHours(0, 0, 0, 0);
    const to = new Date(weekStart);
    to.setDate(to.getDate() + 6);
    to.setHours(23, 59, 59, 999);
    bookingsApi
      .list({
        from: from.toISOString(),
        to: to.toISOString(),
        limit: 500,
      })
      .then(setWeekBookings)
      .catch(() => setWeekBookings([]));
  }, [weekStart]);

  const goPrevWeek = () => {
    setWeekStart((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() - 7);
      return next;
    });
  };
  const goNextWeek = () => {
    setWeekStart((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 7);
      return next;
    });
  };
  const isToday = (d: Date) => {
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  const toggleCell = (day: number, row: number) => {
    setGrid((prev) => {
      const next = prev.map((dayRows, d) =>
        d === day ? dayRows.map((v, r) => (r === row ? !v : v)) : dayRows
      );
      return next;
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    const slots = gridToSlots(grid);
    eventTypesApi
      .setAvailability(selectedId, slots)
      .then(() => {
        setSaving(false);
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          router.push("/bookings");
        }, 1600);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to save");
        setSaving(false);
      });
  };

  if (loading) {
    return (
      <div className="page-root">
        <header className="page-header">
          <h1 className="page-title">Availability</h1>
        </header>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-root">
      {saveSuccess && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] backdrop-blur-sm animate-in"
          role="alert"
          aria-live="polite"
        >
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] px-8 py-6 shadow-xl text-center animate-in">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
              <svg className="h-6 w-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-[var(--foreground)]">Saved</p>
            <p className="mt-1 text-sm text-muted">Taking you back to bookings…</p>
          </div>
        </div>
      )}

      <header className="page-header animate-in">
        <div>
          <Link
            href="/bookings"
            className="text-sm text-muted-dim hover:text-muted mb-1 inline-block transition-colors"
          >
            ← Bookings
          </Link>
          <h1 className="page-title">Availability</h1>
          <p className="page-subtitle">
            Set when each event type is bookable. Red slots are already taken this week.
          </p>
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

      <div className="section-card rounded-2xl animate-in w-full overflow-hidden">
        <div className="mb-6">
          <h2 className="section-title">Weekly schedule</h2>
          <p className="text-sm text-muted mt-0.5">
            Click blocks to toggle. Each row is 30 minutes. Taken slots (from any event type) show in red.
          </p>
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-muted">Event type</label>
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
            className="input-glass w-full max-w-xs sm:max-w-sm"
          >
            <option value="">Select event type…</option>
            {eventTypes.map((et) => (
              <option key={et.id} value={et.id}>
                {et.name} · {et.duration_minutes} min
              </option>
            ))}
          </select>
        </div>

        {eventTypes.length === 0 ? (
          <div className="empty-state py-8">
            <p className="font-medium text-muted">No event types yet</p>
            <p className="mt-1 text-sm">Create an event type from the Bookings page first.</p>
            <Link href="/bookings/event-types/new" className="btn-primary mt-4">
              Create event type
            </Link>
          </div>
        ) : selectedId ? (
          <form onSubmit={handleSave}>
            <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl bg-[var(--surface-elevated)]/50 border border-white/5 px-4 py-3">
              <span className="text-sm font-medium text-muted">Week</span>
              <button
                type="button"
                onClick={goPrevWeek}
                className="rounded-lg bg-[var(--surface)] border border-[var(--card-border)] px-3 py-2 text-sm text-muted hover:bg-white/5 hover:border-[var(--card-border)] transition-colors"
                aria-label="Previous week"
              >
                ← Previous
              </button>
              <span className="text-sm font-semibold text-[var(--foreground)] tabular-nums min-w-[10rem] text-center">
                {weekStart.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              </span>
              <button
                type="button"
                onClick={goNextWeek}
                className="rounded-lg bg-[var(--surface)] border border-[var(--card-border)] px-3 py-2 text-sm text-muted hover:bg-white/5 hover:border-[var(--card-border)] transition-colors"
                aria-label="Next week"
              >
                Next →
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--surface)]/50 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.04)]">
              <div className="overflow-x-auto">
                <table
                  className="w-full min-w-full table-fixed border-collapse text-sm"
                  role="grid"
                  style={{ tableLayout: "fixed" }}
                >
                  <colgroup>
                    <col style={{ width: "11%" }} />
                    {DAYS.map((_, i) => (
                      <col key={i} style={{ width: `${89 / 7}%` }} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr className="bg-[var(--surface-elevated)]">
                      <th
                        className="sticky left-0 z-20 border-b border-r border-[var(--card-border)] px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-muted-dim"
                        scope="col"
                      >
                        Time
                      </th>
                      {DAYS.map((_, i) => (
                        <th
                          key={i}
                          className={`border-b border-r border-[var(--card-border)] px-2 py-3.5 text-center text-xs font-semibold last:border-r-0 ${
                            isToday(weekDates[i])
                              ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                              : "text-muted"
                          }`}
                          scope="col"
                        >
                          <span className="block">{DAYS[i]}</span>
                          <span className="mt-0.5 block text-[11px] font-normal text-muted-dim">
                            {weekDates[i].getDate()}
                          </span>
                          {isToday(weekDates[i]) && (
                            <span className="mt-1 inline-block rounded-full bg-[var(--accent)]/20 px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                              Today
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: END_HOUR - START_HOUR }, (_, hourIndex) => {
                      const row0 = hourIndex * 2;
                      const row1 = hourIndex * 2 + 1;
                      const hourLabel = formatTimeLabel(rowToTime(row0));
                      const isLastHour = hourIndex === END_HOUR - START_HOUR - 1;
                      return (
                        <React.Fragment key={hourIndex}>
                          <tr
                            className={`${hourIndex % 2 === 0 ? "bg-[var(--card-bg-subtle)]" : ""} ${isLastHour ? "[&>td]:border-b-0" : ""}`}
                          >
                            <td
                              rowSpan={2}
                              className="sticky left-0 z-10 border-b border-r border-[var(--card-border)] bg-[var(--surface)] px-3 py-0 align-top pt-2 text-xs font-medium text-muted-dim tabular-nums"
                              scope="rowgroup"
                              style={{ verticalAlign: "top" }}
                            >
                              {hourLabel}
                            </td>
                            {DAYS.map((_, day) => {
                              const dateKey0 = toDateKeyLocal(weekDates[day]);
                              const booked0 = bookedSet.has(`${dateKey0}-${row0}`);
                              return (
                                <td
                                  key={day}
                                  className={`h-9 border-b border-r border-white/5 p-0.5 last:border-r-0 ${
                                    isToday(weekDates[day]) ? "bg-[var(--accent)]/[0.03]" : ""
                                  }`}
                                >
                                  {booked0 ? (
                                    <div
                                      className="flex h-8 w-full items-center justify-center rounded-md bg-[var(--danger)] border border-[var(--danger)] cursor-not-allowed text-[10px] font-semibold text-on-danger uppercase tracking-wider"
                                      title={`${DAYS[day]} ${hourLabel} — Taken`}
                                      aria-label="Taken"
                                    >
                                      Taken
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => toggleCell(day, row0)}
                                      className={`block h-8 w-full rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1 focus:ring-offset-[var(--surface)] active:scale-[0.98] ${
                                        grid[day][row0]
                                          ? "bg-gradient-to-b from-[var(--accent)] to-[var(--accent)]/80 shadow-sm hover:from-[var(--accent-hover)] hover:to-[var(--accent)]"
                                          : "bg-[var(--surface-elevated)]/80 hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--card-border)]"
                                      }`}
                                      title={`${DAYS[day]} ${hourLabel}`}
                                      aria-pressed={grid[day][row0]}
                                    />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                          <tr
                            className={`${hourIndex % 2 === 0 ? "bg-[var(--card-bg-subtle)]" : ""} ${isLastHour ? "[&>td]:border-b-0" : ""}`}
                          >
                            {DAYS.map((_, day) => {
                              const dateKey1 = toDateKeyLocal(weekDates[day]);
                              const booked1 = bookedSet.has(`${dateKey1}-${row1}`);
                              return (
                                <td
                                  key={day}
                                  className={`h-9 border-b border-r border-white/5 p-0.5 last:border-r-0 ${
                                    isToday(weekDates[day]) ? "bg-[var(--accent)]/[0.03]" : ""
                                  }`}
                                >
                                  {booked1 ? (
                                    <div
                                      className="flex h-8 w-full items-center justify-center rounded-md bg-[var(--danger)] border border-[var(--danger)] cursor-not-allowed text-[10px] font-semibold text-on-danger uppercase tracking-wider"
                                      title={`${DAYS[day]} ${hourLabel} — Taken`}
                                      aria-label="Taken"
                                    >
                                      Taken
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => toggleCell(day, row1)}
                                      className={`block h-8 w-full rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1 focus:ring-offset-[var(--surface)] active:scale-[0.98] ${
                                        grid[day][row1]
                                          ? "bg-gradient-to-b from-[var(--accent)] to-[var(--accent)]/80 shadow-sm hover:from-[var(--accent-hover)] hover:to-[var(--accent)]"
                                          : "bg-[var(--surface-elevated)]/80 hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--card-border)]"
                                      }`}
                                      title={`${DAYS[day]} ${hourLabel}`}
                                      aria-pressed={grid[day][row1]}
                                    />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-5 rounded-xl border border-[var(--card-border)] bg-[var(--surface-elevated)]/30 px-5 py-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-dim">Legend</span>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 rounded-md bg-gradient-to-b from-[var(--accent)] to-[var(--accent)]/80 shadow-sm" aria-hidden />
                <span className="text-sm text-muted">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 rounded-md border border-[var(--card-border)] bg-[var(--surface-elevated)]" aria-hidden />
                <span className="text-sm text-muted">Unavailable</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[var(--danger)] border border-[var(--danger)] text-[9px] font-bold text-on-danger uppercase" aria-hidden>
                  Taken
                </span>
                <span className="text-sm font-medium text-danger">Taken</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save availability"}
              </button>
              <Link href="/bookings" className="btn-ghost">
                Back to bookings
              </Link>
            </div>
          </form>
        ) : (
          <p className="text-sm text-muted-dim py-2">Select an event type to edit its availability.</p>
        )}
      </div>
    </div>
  );
}

export default function AvailabilityPage() {
  return (
    <Suspense
      fallback={
        <div className="page-root">
          <header className="page-header">
            <h1 className="page-title">Availability</h1>
          </header>
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="spinner" />
          </div>
        </div>
      }
    >
      <AvailabilityContent />
    </Suspense>
  );
}
