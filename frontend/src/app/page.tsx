"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  dashboardApi,
  campaignsApi,
  automationsApi,
  type AtAGlance,
  type RecentBookingItem,
  type DashboardOverview,
  type DashboardActivityItem,
  type DashboardAlertItem,
  type BookingOverview,
  type Automation,
  type Campaign,
} from "@/lib/api";
import { AnimatedCounter } from "@/components/AnimatedCounter";

function formatRelative(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    "campaign.sent": "Campaign sent",
    "subscriber.created": "Subscriber added",
    "subscriber.imported": "Subscriber imported",
    "automation.entered": "Automation entered",
    "automation.completed": "Automation completed",
    "automation.edited": "Automation edited",
    "form.published": "Form published",
  };
  return map[action] || action.replace(/_/g, " ");
}

function formatBookingTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function DashboardPage() {
  const [atAGlance, setAtAGlance] = useState<AtAGlance | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBookingItem[]>([]);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [growth, setGrowth] = useState<Array<{ date: string; count: number }>>([]);
  const [activity, setActivity] = useState<DashboardActivityItem[]>([]);
  const [alerts, setAlerts] = useState<DashboardAlertItem[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [growthPeriod, setGrowthPeriod] = useState<"7d" | "30d">("7d");
  const [bookingOverview, setBookingOverview] = useState<BookingOverview | null>(null);
  const [bookingRange, setBookingRange] = useState<"7d" | "30d" | "90d">("30d");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const ACTIVITY_PAGE_SIZE = 10;
  const [activityPage, setActivityPage] = useState(0);
  const [activityLoading, setActivityLoading] = useState(false);
  const [hasMoreActivity, setHasMoreActivity] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardApi.getAtAGlance(),
      dashboardApi.getRecentBookings(8),
      dashboardApi.getOverview(),
      dashboardApi.getSubscriberGrowth(growthPeriod),
      dashboardApi.getAlerts(),
      automationsApi.list(0, 100),
      campaignsApi.list(0, 100),
    ])
      .then(([glance, recent, ov, gr, alt, autos, camps]) => {
        setAtAGlance(glance);
        setRecentBookings(recent);
        setOverview(ov);
        setGrowth(gr);
        setAlerts(alt);
        setAutomations(autos);
        setCampaigns(camps);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [growthPeriod]);

  useEffect(() => {
    setActivityLoading(true);
    dashboardApi
      .getActivity(activityPage * ACTIVITY_PAGE_SIZE, ACTIVITY_PAGE_SIZE)
      .then((data) => {
        setActivity(data);
        setHasMoreActivity(data.length >= ACTIVITY_PAGE_SIZE);
      })
      .catch(() => setActivity([]))
      .finally(() => setActivityLoading(false));
  }, [activityPage]);

  useEffect(() => {
    dashboardApi
      .getBookingOverview(bookingRange)
      .then(setBookingOverview)
      .catch(() => setBookingOverview(null));
  }, [bookingRange]);

  const handleDuplicateCampaign = () => {
    if (!overview?.last_sent_campaign_id) return;
    setActionLoading("duplicate");
    campaignsApi
      .duplicate(overview.last_sent_campaign_id)
      .then(() => {
        dashboardApi.getAtAGlance().then(setAtAGlance);
        dashboardApi.getOverview().then(setOverview);
        campaignsApi.list(0, 100).then(setCampaigns);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Duplicate failed"))
      .finally(() => setActionLoading(null));
  };

  const handleResumeAutomation = (id: number) => {
    setActionLoading(`resume-${id}`);
    automationsApi
      .resume(id)
      .then(() => {
        dashboardApi.getAtAGlance().then(setAtAGlance);
        dashboardApi.getOverview().then(setOverview);
        automationsApi.list(0, 100).then(setAutomations);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Resume failed"))
      .finally(() => setActionLoading(null));
  };

  if (loading)
    return (
      <div className="page-root">
        <header className="page-header">
          <div>
            <h1 className="page-title tracking-tight">Dashboard</h1>
            <p className="page-subtitle mt-1">System overview & control center</p>
          </div>
        </header>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
          <div className="spinner" />
          <p className="text-sm font-medium text-[var(--muted-dim)]">Loading dashboard…</p>
        </div>
      </div>
    );
  if (error)
    return (
      <div className="page-root">
        <header className="page-header">
          <h1 className="page-title">Dashboard</h1>
        </header>
        <div className="alert-error animate-in">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="alert-dismiss" aria-label="Dismiss">
            Dismiss
          </button>
        </div>
      </div>
    );
  if (!overview) return null;

  const sc = overview.subscriber_counts;
  const cp = overview.campaign_performance;
  const ap = overview.automation_performance;
  const fp = overview.forms_performance;
  const rev = overview.revenue;
  const pausedAutomations = automations.filter((a) => !a.is_active);
  const draftCampaigns = campaigns.filter((c) => c.status === "draft");
  const booking = bookingOverview;

  const glance = atAGlance;

  return (
    <div className="page-root dashboard-page">
      <header className="page-header dashboard-header">
        <div>
          <h1 className="page-title tracking-tight">Dashboard</h1>
          <p className="page-subtitle">Overview and control center</p>
        </div>
      </header>

      {/* Hero — welcome + live */}
      <section className="dashboard-hero">
        <div className="dashboard-hero-inner">
          <div>
            <h2 className="dashboard-hero-title">Welcome back</h2>
            <p className="dashboard-hero-subtitle">Here’s what’s happening across your account.</p>
          </div>
          <span className="dashboard-live" aria-live="polite">
            <span className="dashboard-live-dot" aria-hidden />
            Live
          </span>
        </div>
      </section>

      {/* Top KPIs — 4 cards */}
      {glance && (
        <section className="dashboard-kpis">
          <Link href="/subscribers" className="dashboard-kpi">
            <span className="dashboard-kpi-value"><AnimatedCounter value={glance.subscribers} /></span>
            <span className="dashboard-kpi-label">Subscribers</span>
          </Link>
          <Link href="/campaigns" className="dashboard-kpi">
            <span className="dashboard-kpi-value"><AnimatedCounter value={glance.campaigns} /></span>
            <span className="dashboard-kpi-label">Campaigns</span>
          </Link>
          <Link href="/automations" className="dashboard-kpi">
            <span className="dashboard-kpi-value"><AnimatedCounter value={glance.active_automations} /></span>
            <span className="dashboard-kpi-label">Active automations</span>
          </Link>
          <Link href="/bookings" className="dashboard-kpi dashboard-kpi-accent">
            <span className="dashboard-kpi-value"><AnimatedCounter value={glance.upcoming_bookings} /></span>
            <span className="dashboard-kpi-label">Upcoming bookings</span>
          </Link>
        </section>
      )}

      {/* Quick actions */}
      <section className="dashboard-actions">
        <div className="dashboard-actions-inner">
          <span className="dashboard-actions-label">Quick actions</span>
          <div className="dashboard-actions-buttons">
            <Link href="/campaigns" className="btn-primary text-sm font-semibold px-5 py-2.5 rounded-xl">
              Create campaign
            </Link>
            <Link href="/automations" className="dashboard-pill">Create automation</Link>
            <Link href="/subscribers" className="dashboard-pill">Add subscriber</Link>
            {overview.last_sent_campaign_id && (
              <button
                type="button"
                onClick={handleDuplicateCampaign}
                disabled={!!actionLoading}
                className="dashboard-pill dashboard-pill-ghost disabled:opacity-50"
              >
                {actionLoading === "duplicate" ? "Duplicating…" : "Duplicate last campaign"}
              </button>
            )}
            {pausedAutomations.length > 0 && (
              <>
                {pausedAutomations.slice(0, 3).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => handleResumeAutomation(a.id)}
                    disabled={!!actionLoading}
                    className="dashboard-pill dashboard-pill-accent disabled:opacity-50"
                  >
                    {actionLoading === `resume-${a.id}` ? "…" : `Resume: ${a.name}`}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </section>

      <div className="dash-bento">
        {/* Top row: charts + recent bookings — always fills 6 cols (no empty right side) */}
        <div className={`dash-card dash-card-modern ${booking ? "dash-bento-cols-2 dash-bento-span-2" : "dash-bento-cols-4"}`}>
          <div className="dash-section-head">
            <span className="dash-section-title">Subscriber growth</span>
            <div className="flex gap-1">
              <button type="button" onClick={() => setGrowthPeriod("7d")} className={`dash-pill text-sm ${growthPeriod === "7d" ? "active" : ""}`}>7d</button>
              <button type="button" onClick={() => setGrowthPeriod("30d")} className={`dash-pill text-sm ${growthPeriod === "30d" ? "active" : ""}`}>30d</button>
            </div>
          </div>
          <div className="dash-chart-wrap h-28">
            {growth.map(({ date: d, count }) => {
              const max = Math.max(1, ...growth.map((g) => g.count));
              const h = max ? (count / max) * 100 : 0;
              return <div key={d} className="dash-chart-bar" style={{ height: `${Math.max(6, h)}%` }} title={`${d}: ${count}`} />;
            })}
          </div>
          <p className="dash-chart-caption">New subscribers per day</p>
        </div>
        {booking ? (
          <div className="dash-card dash-card-modern dash-card-tall dash-bento-cols-4 dash-bento-span-2">
            <div className="dash-section-head">
              <span className="dash-section-title">Booking trends</span>
              <span className="text-xs text-[var(--muted-dim)]">Daily · {booking.time_range}</span>
            </div>
            <div className="dash-chart-wrap h-28">
              {booking.booking_trends.map(({ date: d, count }) => {
                const max = Math.max(1, ...booking.booking_trends.map((t) => t.count));
                const h = max ? (count / max) * 100 : 0;
                return <div key={d} className="dash-chart-bar" style={{ height: `${Math.max(6, h)}%` }} title={`${d}: ${count}`} />;
              })}
            </div>
            <p className="dash-chart-caption">Bookings per day</p>
          </div>
        ) : (
          <div className="dash-card dash-card-modern dash-bento-cols-2">
            <div className="dash-section-head">
              <span className="dash-section-title">Recent bookings</span>
              <Link href="/bookings" className="dash-section-link">View all →</Link>
            </div>
            {recentBookings.length === 0 ? (
              <p className="dash-empty">No bookings yet.</p>
            ) : (
              <div className="space-y-0">
                {recentBookings.slice(0, 6).map((b) => (
                  <div key={b.id} className="dash-recent-row">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-foreground">{b.event_type_name}</span>
                      <span className="text-muted-dim ml-2 text-xs">{b.attendee_name || b.attendee_email || "—"}</span>
                    </div>
                    <span className="dash-recent-time">{formatBookingTime(b.start_at)}</span>
                    <span className={`badge text-xs ${b.status === "confirmed" ? "badge-sent" : b.status === "cancelled" ? "bg-danger-muted text-danger" : "badge-draft"}`}>
                      {b.status.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ——— Bookings (Control Center) ——— */}
        {booking && (
          <>
            <div className="dash-card dash-card-modern dash-bento-full">
              <div className="dash-section-head">
                <span className="dash-section-title">Bookings — Core metrics</span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setBookingRange("7d")} className={`dash-pill text-sm ${bookingRange === "7d" ? "active" : ""}`}>7d</button>
                  <button type="button" onClick={() => setBookingRange("30d")} className={`dash-pill text-sm ${bookingRange === "30d" ? "active" : ""}`}>30d</button>
                  <button type="button" onClick={() => setBookingRange("90d")} className={`dash-pill text-sm ${bookingRange === "90d" ? "active" : ""}`}>90d</button>
                </div>
              </div>
              <div className="dash-metric-grid grid-cols-2 sm:grid-cols-6">
                <div className="dash-metric">
                  <p className="dash-metric-value text-[var(--foreground)]">{booking.upcoming_bookings}</p>
                  <p className="dash-metric-label">Upcoming</p>
                </div>
                <div className="dash-metric">
                  <p className="dash-metric-value text-[var(--foreground)]">{booking.total_bookings}</p>
                  <p className="dash-metric-label">Total ({booking.time_range})</p>
                </div>
                <div className="dash-metric">
                  <p className="dash-metric-value text-warning">{booking.cancellations}</p>
                  <p className="dash-metric-label">Cancellations</p>
                </div>
                <div className="dash-metric">
                  <p className="dash-metric-value text-[var(--muted)]">{booking.reschedules}</p>
                  <p className="dash-metric-label">Reschedules</p>
                </div>
                {booking.payments_enabled && (
                  <div className="dash-metric">
                    <p className="dash-metric-value text-success">${booking.revenue.toFixed(2)}</p>
                    <p className="dash-metric-label">Revenue</p>
                  </div>
                )}
              </div>
            </div>

            <div className="dash-card dash-bento-cols-2">
              <div className="dash-section-head">
                <span className="dash-section-title">Event type performance</span>
                {booking.event_type_performance.length > 5 && <Link href="/bookings" className="dash-section-link">View all →</Link>}
              </div>
              {booking.event_type_performance.length === 0 ? (
                <p className="dash-empty">No event types yet. Create one to see performance.</p>
              ) : (
                <>
                  <ul className="dash-list">
                    {booking.event_type_performance.slice(0, 5).map((et) => (
                      <li key={et.id} className="dash-list-item">
                        <span className="text-[var(--foreground)]">{et.name}</span>
                        <span className="text-[var(--muted-dim)]">{et.bookings_count} bookings</span>
                      </li>
                    ))}
                  </ul>
                  {booking.event_type_performance.length > 5 && (
                    <p className="text-xs text-[var(--muted-dim)] mt-2">+{booking.event_type_performance.length - 5} more · <Link href="/bookings" className="text-[var(--accent)] hover:underline">View all</Link></p>
                  )}
                </>
              )}
            </div>

            <div className="dash-card dash-bento-cols-2">
              <div className="dash-section-head">
                <span className="dash-section-title">Today&apos;s schedule</span>
                {booking.today_schedule.length > 5 && <Link href="/bookings" className="dash-section-link">View all →</Link>}
              </div>
              {booking.today_schedule.length === 0 ? (
                <p className="dash-empty">No bookings today.</p>
              ) : (
                <>
                  <ul className="dash-list">
                    {booking.today_schedule.slice(0, 5).map((b) => (
                      <li key={b.id} className="dash-list-item">
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-[var(--foreground)]">{b.title}</span>
                          <span className="text-xs text-[var(--muted-dim)] ml-2">{b.start_at} – {b.end_at}</span>
                          {b.attendee_name && <span className="block text-sm text-[var(--muted)]">{b.attendee_name}</span>}
                        </div>
                        <span className="badge badge-draft shrink-0">{b.status}</span>
                      </li>
                    ))}
                  </ul>
                  {booking.today_schedule.length > 5 && (
                    <p className="text-xs text-[var(--muted-dim)] mt-2">+{booking.today_schedule.length - 5} more today · <Link href="/bookings" className="text-[var(--accent)] hover:underline">View all</Link></p>
                  )}
                </>
              )}
            </div>

            <div className="dash-card dash-bento-cols-2">
              <div className="dash-section-head">
                <span className="dash-section-title">Pending confirmations</span>
                {booking.pending_confirmations.length > 0 && <span className="badge badge-draft">{booking.pending_confirmations.length}</span>}
              </div>
              {booking.pending_confirmations.length === 0 ? (
                <p className="dash-empty">None. Manual approval not enabled or no pending.</p>
              ) : (
                <ul className="dash-list">
                  {booking.pending_confirmations.slice(0, 5).map((p) => (
                    <li key={p.id} className="dash-list-item">
                      <span className="text-[var(--foreground)]">{p.event_type_name}</span>
                      <span className="text-xs text-[var(--muted-dim)]">{p.attendee_email ?? "—"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="dash-card dash-bento-full">
              <div className="dash-section-head">
                <span className="dash-section-title">Team booking load</span>
                {booking.team_booking_load.length > 5 && <Link href="/bookings" className="dash-section-link">View all →</Link>}
              </div>
              {booking.team_booking_load.length === 0 ? (
                <p className="dash-empty">No team data yet.</p>
              ) : (
                <>
                  <ul className="dash-list">
                    {booking.team_booking_load.slice(0, 5).map((t) => (
                      <li key={t.member_id} className="dash-list-item">
                        <span className="text-[var(--foreground)]">{t.member_name}</span>
                        <span className="text-[var(--muted-dim)]">{t.bookings_count} bookings</span>
                      </li>
                    ))}
                  </ul>
                  {booking.team_booking_load.length > 5 && (
                    <p className="text-xs text-[var(--muted-dim)] mt-2">+{booking.team_booking_load.length - 5} more · <Link href="/bookings" className="text-[var(--accent)] hover:underline">View all</Link></p>
                  )}
                </>
              )}
            </div>

            <div className="dash-card dash-card-compact dash-bento-full">
              <div className="dash-section-head">
                <span className="dash-section-title">Booking quick actions</span>
                <div className="dash-pill-group">
                  <Link href="/bookings/event-types/new" className="dash-pill">Quick create event type</Link>
                  <Link href="/bookings/availability" className="dash-pill">Quick availability edit</Link>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Recent bookings — when booking data exists, show in second row */}
        {booking && (
          <div className="dash-card dash-card-modern dash-bento-cols-2 dash-bento-span-2">
            <div className="dash-section-head">
              <span className="dash-section-title">Recent bookings</span>
              <Link href="/bookings" className="dash-section-link">View all →</Link>
            </div>
            {recentBookings.length === 0 ? (
              <p className="dash-empty">No bookings yet.</p>
            ) : (
              <div className="space-y-0">
                {recentBookings.slice(0, 6).map((b) => (
                  <div key={b.id} className="dash-recent-row">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-foreground">{b.event_type_name}</span>
                      <span className="text-muted-dim ml-2 text-xs">{b.attendee_name || b.attendee_email || "—"}</span>
                    </div>
                    <span className="dash-recent-time">{formatBookingTime(b.start_at)}</span>
                    <span className={`badge text-xs ${b.status === "confirmed" ? "badge-sent" : b.status === "cancelled" ? "bg-danger-muted text-danger" : "badge-draft"}`}>
                      {b.status.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Subscribers — full width when no booking (no empty cols); 4 cols when booking (sits next to Recent bookings) */}
        <div className={`dash-card dash-card-modern dash-card-tall ${booking ? "dash-bento-cols-4 dash-bento-span-2" : "dash-bento-full"}`}>
          <div className="dash-section-head">
            <span className="dash-section-title">Subscribers</span>
            <Link href="/subscribers" className="dash-section-link">Manage →</Link>
          </div>
          <div className="dash-metric-grid grid-cols-2 sm:grid-cols-5">
            <div className="dash-metric">
              <p className="dash-metric-value text-[var(--foreground)]">{sc.total}</p>
              <p className="dash-metric-label">Total</p>
            </div>
            <div className="dash-metric">
              <p className="dash-metric-value text-success">{sc.active}</p>
              <p className="dash-metric-label">Active</p>
            </div>
            <div className="dash-metric">
              <p className="dash-metric-value text-[var(--muted)]">{sc.unsubscribed}</p>
              <p className="dash-metric-label">Unsubscribed</p>
            </div>
            <div className="dash-metric">
              <p className="dash-metric-value text-warning">{sc.bounced}</p>
              <p className="dash-metric-label">Bounced</p>
            </div>
            <div className="dash-metric">
              <p className="dash-metric-value text-danger">{sc.suppressed}</p>
              <p className="dash-metric-label">Suppressed</p>
            </div>
          </div>
        </div>

        {/* Campaign — wide, single row */}
        <div className="dash-card dash-card-modern dash-bento-cols-4">
          <div className="dash-section-head">
            <span className="dash-section-title">Campaign performance</span>
            <Link href="/campaigns" className="dash-section-link">View →</Link>
          </div>
          <div className="dash-metric-grid grid-cols-3 sm:grid-cols-6">
            <div className="dash-metric"><p className="dash-metric-value text-[var(--foreground)]">{cp.emails_sent}</p><p className="dash-metric-label">Sent</p></div>
            <div className="dash-metric"><p className="dash-metric-value text-[var(--foreground)]">{cp.delivered}</p><p className="dash-metric-label">Delivered</p></div>
            <div className="dash-metric"><p className="dash-metric-value text-[var(--foreground)]">{cp.opens}</p><p className="dash-metric-label">Opens</p></div>
            <div className="dash-metric"><p className="dash-metric-value text-[var(--foreground)]">{cp.clicks}</p><p className="dash-metric-label">Clicks</p></div>
            <div className="dash-metric"><p className="dash-metric-value text-warning">{cp.unsubscribes}</p><p className="dash-metric-label">Unsubs</p></div>
            <div className="dash-metric"><p className="dash-metric-value text-danger">{cp.spam_complaints}</p><p className="dash-metric-label">Spam</p></div>
          </div>
        </div>

        {/* Automation — narrow, single row */}
        <div className="dash-card dash-bento-cols-2">
          <div className="dash-section-head">
            <span className="dash-section-title">Automation performance</span>
            <Link href="/automations" className="dash-section-link">Configure →</Link>
          </div>
          <div className="dash-metric-grid grid-cols-2 sm:grid-cols-4">
            <div className="dash-metric"><p className="dash-metric-value text-[var(--foreground)]">{ap.active_automations}</p><p className="dash-metric-label">Active</p></div>
            <div className="dash-metric"><p className="dash-metric-value text-[var(--foreground)]">{ap.subscribers_in_automations}</p><p className="dash-metric-label">In progress</p></div>
            <div className="dash-metric"><p className="dash-metric-value text-[var(--foreground)]">{ap.emails_queued}</p><p className="dash-metric-label">Queued</p></div>
            <div className="dash-metric"><p className="dash-metric-value text-success">{ap.emails_sent_via_automation}</p><p className="dash-metric-label">Sent</p></div>
          </div>
        </div>

        {/* Forms — small card */}
        <div className="dash-card dash-card-muted dash-bento-cols-2">
          <div className="dash-section-head">
            <span className="dash-section-title">Forms</span>
            <span className="text-xs text-[var(--muted-dim)]">Coming soon</span>
          </div>
          <div className="dash-metric-grid grid-cols-3">
            <div className="dash-metric"><p className="dash-metric-value">{fp.views}</p><p className="dash-metric-label">Views</p></div>
            <div className="dash-metric"><p className="dash-metric-value">{fp.submissions}</p><p className="dash-metric-label">Submissions</p></div>
            <div className="dash-metric"><p className="dash-metric-value">{fp.conversion_rate ? `${(fp.conversion_rate * 100).toFixed(1)}%` : "—"}</p><p className="dash-metric-label">Conversion</p></div>
          </div>
        </div>

        {/* Revenue — small card */}
        <div className="dash-card dash-card-muted dash-bento-cols-2">
          <div className="dash-section-head">
            <span className="dash-section-title">Revenue</span>
            <span className="text-xs text-[var(--muted-dim)]">Optional</span>
          </div>
          <div className="dash-metric-grid grid-cols-3">
            <div className="dash-metric"><p className="dash-metric-value">${rev.campaign_revenue.toFixed(2)}</p><p className="dash-metric-label">Campaign</p></div>
            <div className="dash-metric"><p className="dash-metric-value">${rev.automation_revenue.toFixed(2)}</p><p className="dash-metric-label">Automation</p></div>
            <div className="dash-metric"><p className="dash-metric-value">${rev.per_subscriber_value.toFixed(2)}</p><p className="dash-metric-label">Per subscriber</p></div>
          </div>
        </div>

        {/* Alerts — small card */}
        <div className="dash-card dash-bento-cols-2">
          <div className="dash-section-head">
            <span className="dash-section-title">System alerts</span>
            {alerts.length > 0 && <Link href="/campaigns" className="dash-section-link">View →</Link>}
          </div>
          {alerts.length === 0 ? (
            <p className="dash-empty">No active alerts. System healthy.</p>
          ) : (
            <ul className="dash-list">
              {alerts.map((a) => (
                <li key={a.id} className="dash-list-item">
                  <span className="font-medium text-[var(--foreground)] text-sm">{a.alert_type.replace(/_/g, " ")}</span>
                  <span className="flex items-center gap-2">
                    {a.last_triggered_at && <span className="text-xs text-[var(--muted-dim)]">{formatRelative(a.last_triggered_at)}</span>}
                    <span className={`badge ${a.enabled ? "badge-draft" : "badge-sent"}`}>{a.enabled ? "On" : "Off"}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Activity — full width, paginated */}
        <div className="dash-card dash-card-modern dash-card-tall dash-bento-full">
          <div className="dash-section-head">
            <span className="dash-section-title">Recent activity</span>
            <Link href="/campaigns" className="dash-section-link">View campaigns →</Link>
          </div>
          {activityLoading && activity.length === 0 ? (
            <p className="dash-empty">Loading activity…</p>
          ) : activity.length === 0 ? (
            <p className="dash-empty">No recent activity.</p>
          ) : (
            <>
              <ul className="dash-list dash-activity-list">
                {activity.map((r) => (
                  <li key={r.id} className="dash-list-item">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="dash-activity-dot" aria-hidden />
                      <span className="text-[var(--muted-dim)] shrink-0 w-14 text-xs">{formatRelative(r.created_at || "")}</span>
                      <span className="text-[var(--foreground)] truncate">{formatAction(r.action)}</span>
                    </div>
                    {r.entity_type && r.entity_id != null && <span className="text-[var(--muted-dim)] text-xs shrink-0">#{r.entity_id}</span>}
                  </li>
                ))}
              </ul>
              <nav className="dash-pagination" aria-label="Activity pagination">
                <button
                  type="button"
                  className="dash-pagination-btn"
                  disabled={activityPage === 0 || activityLoading}
                  onClick={() => setActivityPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </button>
                <span className="dash-pagination-info">
                  Page {activityPage + 1}
                </span>
                <button
                  type="button"
                  className="dash-pagination-btn"
                  disabled={!hasMoreActivity || activityLoading}
                  onClick={() => setActivityPage((p) => p + 1)}
                >
                  Next
                </button>
              </nav>
            </>
          )}
        </div>

        {/* Draft CTA — full width */}
        {draftCampaigns.length > 0 && (
          <div className="dash-cta-card dash-bento-full">
            <div>
              <p className="dash-cta-title">You have {draftCampaigns.length} draft campaign{draftCampaigns.length !== 1 ? "s" : ""}</p>
              <p className="dash-cta-desc">Send or edit from Campaigns.</p>
            </div>
            <Link href="/campaigns" className="btn-primary">Jump to campaigns</Link>
          </div>
        )}
      </div>
    </div>
  );
}
