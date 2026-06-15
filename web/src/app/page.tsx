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
import { Button } from "@/components/ui";

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
          <p className="text-sm font-medium text-muted-dim">Loading dashboard…</p>
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

  const lastCampaign = overview.last_sent_campaign_id
    ? campaigns.find((c) => c.id === overview.last_sent_campaign_id)
    : null;
  const sentCount = lastCampaign?.sent_count ?? 0;
  const opens = lastCampaign?.opens ?? 0;
  const clicks = lastCampaign?.clicks ?? 0;
  const openRatePct = sentCount > 0 ? ((opens / sentCount) * 100).toFixed(1) : "0";
  const clickRatePct = sentCount > 0 ? ((clicks / sentCount) * 100).toFixed(1) : "0";
  const ctorPct = opens > 0 ? ((clicks / opens) * 100).toFixed(1) : "0";
  const growthSum = growth.reduce((a, g) => a + g.count, 0);

  return (
    <div className="page-root dashboard-page ml-dashboard">
      <header className="ml-dash-header">
        <div>
          <h1 className="page-title tracking-tight">Dashboard</h1>
          <p className="page-subtitle">Performance overview</p>
        </div>
        <div className="ml-dash-timeframe">
          <span className="ml-dash-timeframe-label">Time period</span>
          <div className="ml-dash-timeframe-btns">
            <button
              type="button"
              onClick={() => setGrowthPeriod("7d")}
              className={growthPeriod === "7d" ? "active" : ""}
            >
              Last 7 days
            </button>
            <button
              type="button"
              onClick={() => setGrowthPeriod("30d")}
              className={growthPeriod === "30d" ? "active" : ""}
            >
              Last 30 days
            </button>
          </div>
        </div>
      </header>

      {/* Last campaign — MailerLite-style first block */}
      {lastCampaign && (
        <section className="ml-section ml-last-campaign">
          <div className="ml-section-head">
            <h2 className="ml-section-title">Last campaign</h2>
            <Link href={`/campaigns?id=${lastCampaign.id}`} className="ml-section-link">
              View report →
            </Link>
          </div>
          <div className="ml-last-campaign-meta">
            <p className="ml-last-campaign-name">{lastCampaign.name}</p>
            <p className="ml-last-campaign-subject">{lastCampaign.subject}</p>
          </div>
          <div className="ml-last-campaign-stats">
            <div className="ml-stat">
              <span className="ml-stat-value"><AnimatedCounter value={sentCount} /></span>
              <span className="ml-stat-label">Recipients</span>
            </div>
            <div className="ml-stat">
              <span className="ml-stat-value">{openRatePct}%</span>
              <span className="ml-stat-label">Open rate</span>
            </div>
            <div className="ml-stat">
              <span className="ml-stat-value">{clickRatePct}%</span>
              <span className="ml-stat-label">Click rate</span>
            </div>
            <div className="ml-stat">
              <span className="ml-stat-value">{ctorPct}%</span>
              <span className="ml-stat-label">CTOR</span>
            </div>
          </div>
        </section>
      )}

      {/* Quick actions — compact */}
      <section className="ml-actions">
        <Link href="/campaigns"><Button size="md">Create campaign</Button></Link>
        <Link href="/automations" className="ml-pill">Create automation</Link>
        <Link href="/subscribers" className="ml-pill">Add subscriber</Link>
        {overview.last_sent_campaign_id && (
          <button
            type="button"
            onClick={handleDuplicateCampaign}
            disabled={!!actionLoading}
            className="ml-pill ml-pill-ghost disabled:opacity-50"
          >
            {actionLoading === "duplicate" ? "Duplicating…" : "Duplicate last campaign"}
          </button>
        )}
        {pausedAutomations.slice(0, 3).map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => handleResumeAutomation(a.id)}
            disabled={!!actionLoading}
            className="ml-pill ml-pill-accent disabled:opacity-50"
          >
            {actionLoading === `resume-${a.id}` ? "…" : `Resume: ${a.name}`}
          </button>
        ))}
      </section>

      <p className="ml-overview-note">Performance overview for the selected period. Filter by time above.</p>

      <div className="ml-sections">
        {/* Subscribers — MailerLite-style */}
        <section className="ml-section">
          <div className="ml-section-head">
            <h2 className="ml-section-title">Subscribers</h2>
            <Link href="/subscribers" className="ml-section-link">Manage →</Link>
          </div>
          <div className="ml-metrics">
            <div className="ml-metric">
              <span className="ml-metric-value text-foreground"><AnimatedCounter value={sc.active} /></span>
              <span className="ml-metric-label">Total active</span>
            </div>
            <div className="ml-metric">
              <span className="ml-metric-value text-success">{growthSum}</span>
              <span className="ml-metric-label">New ({growthPeriod})</span>
            </div>
            <div className="ml-metric">
              <span className="ml-metric-value text-muted">{sc.unsubscribed}</span>
              <span className="ml-metric-label">Unsubscribed</span>
            </div>
          </div>
          <div className="ml-chart-wrap">
            {growth.map(({ date: d, count }) => {
              const max = Math.max(1, ...growth.map((g) => g.count));
              const h = max ? (count / max) * 100 : 0;
              return <div key={d} className="ml-chart-bar" style={{ height: `${Math.max(8, h)}%` }} title={`${d}: ${count}`} />;
            })}
          </div>
          <p className="ml-chart-caption">New subscribers per day</p>
        </section>

        {/* Campaigns */}
        <section className="ml-section">
          <div className="ml-section-head">
            <h2 className="ml-section-title">Campaigns</h2>
            <Link href="/campaigns" className="ml-section-link">View →</Link>
          </div>
          <div className="ml-metrics">
            <div className="ml-metric"><span className="ml-metric-value text-foreground">{cp.emails_sent}</span><span className="ml-metric-label">Emails sent</span></div>
            <div className="ml-metric"><span className="ml-metric-value text-foreground">{cp.opens}</span><span className="ml-metric-label">Opens</span></div>
            <div className="ml-metric"><span className="ml-metric-value text-foreground">{cp.clicks}</span><span className="ml-metric-label">Clicks</span></div>
            <div className="ml-metric">
              <span className="ml-metric-value text-foreground">
                {cp.emails_sent > 0 && cp.opens > 0 ? ((cp.clicks / cp.opens) * 100).toFixed(1) : "0"}%
              </span>
              <span className="ml-metric-label">CTOR</span>
            </div>
          </div>
          <div className="ml-opens-clicks">
            <div className="ml-oc-bar-wrap">
              <span className="ml-oc-label">Opens</span>
              <div className="ml-oc-bar" style={{ width: `${cp.emails_sent ? Math.min(100, (cp.opens / cp.emails_sent) * 100) : 0}%` }} />
            </div>
            <div className="ml-oc-bar-wrap">
              <span className="ml-oc-label">Clicks</span>
              <div className="ml-oc-bar ml-oc-bar-clicks" style={{ width: `${cp.emails_sent ? Math.min(100, (cp.clicks / cp.emails_sent) * 100) : 0}%` }} />
            </div>
          </div>
        </section>

        {/* Automations */}
        <section className="ml-section">
          <div className="ml-section-head">
            <h2 className="ml-section-title">Automations</h2>
            <Link href="/automations" className="ml-section-link">Configure →</Link>
          </div>
          <div className="ml-metrics">
            <div className="ml-metric"><span className="ml-metric-value text-foreground">{ap.active_automations}</span><span className="ml-metric-label">Active</span></div>
            <div className="ml-metric"><span className="ml-metric-value text-foreground">{ap.subscribers_in_automations}</span><span className="ml-metric-label">In progress</span></div>
            <div className="ml-metric"><span className="ml-metric-value text-foreground">{ap.emails_queued}</span><span className="ml-metric-label">Queued</span></div>
            <div className="ml-metric"><span className="ml-metric-value text-success">{ap.emails_sent_via_automation}</span><span className="ml-metric-label">Sent</span></div>
          </div>
          {automations.length > 0 && (
            <div className="ml-list-wrap">
              <p className="ml-list-title">Workflows</p>
              <ul className="ml-list">
                {automations.slice(0, 5).map((a) => (
                  <li key={a.id} className="ml-list-item">
                    <Link href={`/automations?id=${a.id}`} className="ml-list-link">{a.name}</Link>
                    <span className={`ml-badge ${a.is_active ? "ml-badge-active" : "ml-badge-paused"}`}>{a.is_active ? "Active" : "Paused"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Forms */}
        <section className="ml-section">
          <div className="ml-section-head">
            <h2 className="ml-section-title">Forms</h2>
            <Link href="/forms" className="ml-section-link">Manage →</Link>
          </div>
          <div className="ml-metrics">
            <div className="ml-metric"><span className="ml-metric-value text-foreground">{fp.views}</span><span className="ml-metric-label">Views</span></div>
            <div className="ml-metric"><span className="ml-metric-value text-foreground">{fp.submissions}</span><span className="ml-metric-label">Signups</span></div>
            <div className="ml-metric"><span className="ml-metric-value text-muted">{fp.conversion_rate ? `${(fp.conversion_rate * 100).toFixed(1)}%` : "—"}</span><span className="ml-metric-label">Conversion</span></div>
          </div>
        </section>

        {/* Recent activity */}
        <section className="ml-section ml-section-full">
          <div className="ml-section-head">
            <h2 className="ml-section-title">Recent activity</h2>
            <Link href="/campaigns" className="ml-section-link">View campaigns →</Link>
          </div>
          {activityLoading && activity.length === 0 ? (
            <p className="ml-empty">Loading activity…</p>
          ) : activity.length === 0 ? (
            <p className="ml-empty">No recent activity.</p>
          ) : (
            <>
              <ul className="ml-activity-list">
                {activity.map((r) => (
                  <li key={r.id} className="ml-activity-item">
                    <span className="ml-activity-dot" aria-hidden />
                    <span className="ml-activity-time">{formatRelative(r.created_at || "")}</span>
                    <span className="ml-activity-action">{formatAction(r.action)}</span>
                    {r.entity_id != null && <span className="ml-activity-id">#{r.entity_id}</span>}
                  </li>
                ))}
              </ul>
              <nav className="ml-pagination" aria-label="Activity pagination">
                <button type="button" className="ml-pagination-btn" disabled={activityPage === 0 || activityLoading} onClick={() => setActivityPage((p) => Math.max(0, p - 1))}>Previous</button>
                <span className="ml-pagination-info">Page {activityPage + 1}</span>
                <button type="button" className="ml-pagination-btn" disabled={!hasMoreActivity || activityLoading} onClick={() => setActivityPage((p) => p + 1)}>Next</button>
              </nav>
            </>
          )}
        </section>

        {/* Bookings — compact */}
        <section className="ml-section ml-section-full ml-section-muted">
          <div className="ml-section-head">
            <h2 className="ml-section-title">Bookings</h2>
            <Link href="/bookings" className="ml-section-link">View all →</Link>
          </div>
          {booking ? (
            <div className="ml-metrics ml-metrics-inline">
              <div className="ml-metric"><span className="ml-metric-value text-foreground">{booking.upcoming_bookings}</span><span className="ml-metric-label">Upcoming</span></div>
              <div className="ml-metric"><span className="ml-metric-value text-foreground">{booking.total_bookings}</span><span className="ml-metric-label">Total ({booking.time_range})</span></div>
              {booking.today_schedule.length > 0 && (
                <div className="ml-metric"><span className="ml-metric-value text-success">{booking.today_schedule.length}</span><span className="ml-metric-label">Today</span></div>
              )}
            </div>
          ) : (
            <p className="ml-empty">No booking data. Set up event types to see metrics.</p>
          )}
          {recentBookings.length > 0 && (
            <div className="ml-recent-wrap">
              <p className="ml-list-title">Recent</p>
              {recentBookings.slice(0, 4).map((b) => (
                <div key={b.id} className="ml-recent-row">
                  <span className="text-foreground font-medium truncate">{b.event_type_name}</span>
                  <span className="text-muted text-xs">{formatBookingTime(b.start_at)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Alerts */}
        {alerts.length > 0 && (
          <section className="ml-section ml-section-full">
            <div className="ml-section-head">
              <h2 className="ml-section-title">System alerts</h2>
              <Link href="/campaigns" className="ml-section-link">View →</Link>
            </div>
            <ul className="ml-list">
              {alerts.map((a) => (
                <li key={a.id} className="ml-list-item">
                  <span className="font-medium text-foreground text-sm">{a.alert_type.replace(/_/g, " ")}</span>
                  <span className={`ml-badge ${a.enabled ? "ml-badge-active" : ""}`}>{a.enabled ? "On" : "Off"}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Draft CTA */}
        {draftCampaigns.length > 0 && (
          <section className="ml-cta ml-section-full">
            <p className="ml-cta-title">You have {draftCampaigns.length} draft campaign{draftCampaigns.length !== 1 ? "s" : ""}</p>
            <p className="ml-cta-desc">Send or edit from Campaigns.</p>
            <Link href="/campaigns"><Button>Jump to campaigns</Button></Link>
          </section>
        )}
      </div>
    </div>
  );
}
