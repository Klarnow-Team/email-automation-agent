"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "overview", title: "System overview" },
  { id: "dashboard", title: "Dashboard" },
  { id: "subscribers", title: "Subscribers" },
  { id: "campaigns", title: "Campaigns" },
  { id: "automations", title: "Automations" },
  { id: "segments", title: "Segments" },
  { id: "groups", title: "Groups" },
  { id: "tags", title: "Tags" },
  { id: "suppression", title: "Suppression list" },
  { id: "forms", title: "Forms" },
  { id: "bookings", title: "Bookings" },
  { id: "profile", title: "Profile" },
  { id: "workers", title: "Backend workers" },
];

export default function ManualPage() {
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const els = SECTIONS.map(({ id }) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActiveId(e.target.id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="page-root manual-page">
      <header className="page-header manual-hero animate-in">
        <div>
          <h1 className="page-title">Manual</h1>
          <p className="page-subtitle">
            Complete guide to the Klarnow mailing and booking system — concepts, pages, and workflows.
          </p>
        </div>
      </header>

      <div className="manual-layout">
        <aside className="manual-toc" aria-label="On this page">
          <p className="manual-toc-title">On this page</p>
          <ul className="manual-toc-list">
            {SECTIONS.map(({ id, title }) => (
              <li key={id}>
                <a href={`#${id}`} data-active={activeId === id ? "true" : undefined}>
                  {title}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        <main className="manual-content">
          <section id="overview" className="manual-section">
            <h2 className="manual-section-heading">System overview</h2>
            <p>
              Klarnow is an all-in-one tool that combines <strong>email marketing</strong> (MailerLite-style) and <strong>scheduling &amp; bookings</strong> (Cal.com-style). It runs as a FastAPI backend with a Next.js frontend; email is sent via Resend.
            </p>
            <h3>Email marketing</h3>
            <ul>
              <li><strong>Subscribers</strong> — Your list: email, name, status (active/unsubscribed/bounced/suppressed), custom fields, groups, and tags.</li>
              <li><strong>Campaigns</strong> — One-off emails: draft, send to all or a segment, optional A/B test, scheduled send, plain-text, re-send to non-openers.</li>
              <li><strong>Automations</strong> — Trigger-based flows: e.g. when a subscriber is added, send an email, wait, then send another or add to a group/tag.</li>
              <li><strong>Segments</strong> — Rules (status, email, name, group, tag, custom field, created date, opened/clicked campaign) with AND/OR logic.</li>
              <li><strong>Groups &amp; tags</strong> — Organize subscribers; use in segments and automations (e.g. add to group on form submit).</li>
              <li><strong>Suppression list</strong> — Block specific emails or whole domains from receiving any campaign.</li>
              <li><strong>Forms</strong> — Create a form, get a submit URL; POST email (and optional name/data) to add or update subscribers, optionally add to a group or trigger an automation.</li>
            </ul>
            <h3>Bookings</h3>
            <ul>
              <li><strong>Event types</strong> — Define bookable slots (duration, availability, questions).</li>
              <li><strong>Availability</strong> — Weekly schedule, overrides, vacation blocks; optional Google Calendar sync.</li>
              <li><strong>Public booking</strong> — Invitees pick a time, fill questions, get confirmation and reminders.</li>
              <li><strong>Webhooks, audit log, rate limiting</strong> — For integrations and safety.</li>
            </ul>
          </section>

          <section id="dashboard" className="manual-section">
            <h2 className="manual-section-heading">Dashboard</h2>
            <p>
              <Link href="/" className="text-(--accent) hover:underline font-medium">Dashboard</Link> is the home screen. It shows:
            </p>
            <ul>
              <li><strong>At a glance</strong> — Subscribers, campaigns, active automations, upcoming bookings.</li>
              <li><strong>Quick actions</strong> — Create campaign, automation, add subscriber; duplicate last campaign; resume paused automations.</li>
              <li><strong>Subscriber growth</strong> — Chart of new subscribers (7d or 30d).</li>
              <li><strong>Booking metrics</strong> — If you use bookings: upcoming/total, cancellations, revenue, event-type performance, today’s schedule, pending confirmations, team load.</li>
              <li><strong>Campaign &amp; automation performance</strong> — Sent, opens, clicks, queued, etc.</li>
              <li><strong>Forms &amp; revenue</strong> — Placeholder metrics.</li>
              <li><strong>Recent activity</strong> — Log of actions (campaign sent, subscriber added, etc.) with pagination.</li>
              <li><strong>Draft campaigns CTA</strong> — Link to campaigns when you have drafts.</li>
            </ul>
            <p className="text-sm text-muted-dim">Data is loaded from the API on mount; use quick actions to jump to the right page.</p>
          </section>

          <section id="subscribers" className="manual-section">
            <h2 className="manual-section-heading">Subscribers</h2>
            <p>
              <Link href="/subscribers" className="text-(--accent) hover:underline font-medium">Subscribers</Link> manages your email list.
            </p>
            <ul>
              <li><strong>Add one</strong> — Email and optional name (and custom fields if supported in the UI).</li>
              <li><strong>Import</strong> — Paste CSV/TSV (email, name); each row creates a subscriber and can trigger &quot;subscriber added&quot; automations.</li>
              <li><strong>List</strong> — Search, paginate; view status, groups, tags; edit or delete.</li>
              <li><strong>Bulk update</strong> — Set name or status for selected IDs.</li>
              <li><strong>Activity</strong> — Per-subscriber timeline (created, campaign sent, opened, etc.).</li>
            </ul>
            <p className="text-sm text-muted-dim">Statuses: active (receives mail), unsubscribed, bounced, suppressed. Only active subscribers are included when sending campaigns (unless you target by segment).</p>
          </section>

          <section id="campaigns" className="manual-section">
            <h2 className="manual-section-heading">Campaigns</h2>
            <p>
              <Link href="/campaigns" className="text-(--accent) hover:underline font-medium">Campaigns</Link> are one-off emails you send to subscribers.
            </p>
            <ul>
              <li><strong>Create</strong> — Name, subject, HTML body; optional image URL, plain-text body, schedule date/time, and A/B test (variant B subject + body and split %).</li>
              <li><strong>Send</strong> — Drafts can be sent to &quot;all active subscribers&quot; (respecting suppression list). Sending is final; opens and clicks are tracked.</li>
              <li><strong>Re-send to non-openers</strong> — For a sent campaign, open this flow to choose another draft and send it only to people who received but did not open the first campaign.</li>
              <li><strong>Scheduled send</strong> — Set <code>scheduled_at</code>; a backend worker (process-scheduled-campaigns) must run to send at that time.</li>
              <li><strong>Duplicate / Delete</strong> — Duplicate creates a new draft; delete removes the campaign.</li>
            </ul>
            <p className="text-sm text-muted-dim">Tokens like <code>{`{{name}}`}</code>, <code>{`{{email}}`}</code> are replaced per subscriber. Tracking (opens/clicks) uses your configured tracking base URL and secret.</p>
          </section>

          <section id="automations" className="manual-section">
            <h2 className="manual-section-heading">Automations</h2>
            <p>
              <Link href="/automations" className="text-(--accent) hover:underline font-medium">Automations</Link> are trigger-based flows: when something happens, run a sequence of steps.
            </p>
            <ul>
              <li><strong>Trigger types</strong> — subscriber_added, api_trigger, group_joined, group_left, field_updated. Only active automations run.</li>
              <li><strong>Steps</strong> — email (subject + HTML), delay (minutes), update_field (custom field), add_to_group / remove_from_group, add_tag / remove_tag, trigger_automation (start another automation).</li>
              <li><strong>Run behavior</strong> — One run per subscriber; delays create pending jobs; a worker (process-automation-delays) must run to resume after a delay.</li>
              <li><strong>Manual trigger</strong> — Use &quot;Trigger&quot; with a subscriber ID to start a run for testing.</li>
            </ul>
            <p className="text-sm text-muted-dim">Pause/resume from the UI; editing steps replaces all steps for that automation.</p>
          </section>

          <section id="segments" className="manual-section">
            <h2 className="manual-section-heading">Segments</h2>
            <p>
              <Link href="/segments" className="text-(--accent) hover:underline font-medium">Segments</Link> define audiences by rules. Top-level rules are ANDed; use nested <code>and</code> / <code>or</code> for complex logic.
            </p>
            <ul>
              <li><strong>Fields</strong> — status, email, name, in_group, not_in_group, has_tag, not_has_tag, custom_field (with key), created_at (within_days / older_than_days), opened_campaign, clicked_campaign.</li>
              <li><strong>Operators</strong> — eq, ne, contains, startswith, empty (where applicable).</li>
              <li><strong>Use</strong> — When sending a campaign you can restrict to a segment (via subscriber IDs from the segment endpoint). Segments are evaluated in real time when you request subscriber IDs.</li>
            </ul>
            <p className="text-sm text-muted-dim">Empty rules = all subscribers. Create a segment, add rules, then use &quot;Subscriber IDs&quot; or the campaign send flow with that segment.</p>
          </section>

          <section id="groups" className="manual-section">
            <h2 className="manual-section-heading">Groups</h2>
            <p>
              <Link href="/groups" className="text-(--accent) hover:underline font-medium">Groups</Link> are named collections of subscribers (e.g. &quot;Newsletter&quot;, &quot;Beta&quot;). Subscribers can be in multiple groups.
            </p>
            <ul>
              <li><strong>Create / edit / delete</strong> — Name only. Deleting a group does not delete subscribers.</li>
              <li><strong>Manage members</strong> — Open a group and check/uncheck subscribers to add or remove them; save to apply. Or use the API to set the full list.</li>
              <li><strong>Use in segments</strong> — in_group / not_in_group with the group ID. Use in automations (add_to_group / remove_from_group step) and forms (add to group on submit).</li>
            </ul>
            <p className="text-sm text-muted-dim">When a subscriber is added to a group, automations with trigger group_joined can run; when removed, group_left can run.</p>
          </section>

          <section id="tags" className="manual-section">
            <h2 className="manual-section-heading">Tags</h2>
            <p>
              <Link href="/tags" className="text-(--accent) hover:underline font-medium">Tags</Link> are labels on subscribers (e.g. &quot;VIP&quot;, &quot;Product A&quot;). Same idea as groups but lighter-weight; a subscriber can have many tags.
            </p>
            <ul>
              <li><strong>Create / edit / delete</strong> — Name only.</li>
              <li><strong>Manage subscribers</strong> — Check/uncheck who has the tag; save.</li>
              <li><strong>Use in segments</strong> — has_tag / not_has_tag. Use in automations (add_tag / remove_tag) and optionally in forms.</li>
            </ul>
          </section>

          <section id="suppression" className="manual-section">
            <h2 className="manual-section-heading">Suppression list</h2>
            <p>
              <Link href="/suppression" className="text-(--accent) hover:underline font-medium">Suppression</Link> blocks specific emails or entire domains from receiving campaigns. No campaign send will include them.
            </p>
            <ul>
              <li><strong>Add</strong> — Type: email (one address) or domain (e.g. example.com blocks *@example.com). Value is normalized (lowercase; domain without @).</li>
              <li><strong>Remove</strong> — Delete an entry to allow that email/domain again.</li>
            </ul>
            <p className="text-sm text-muted-dim">Use for bounces, unsubscribes, or compliance. The send logic filters recipients against this list before calling the email provider.</p>
          </section>

          <section id="forms" className="manual-section">
            <h2 className="manual-section-heading">Forms</h2>
            <p>
              <Link href="/forms" className="text-(--accent) hover:underline font-medium">Forms</Link> give you a submit URL to collect signups from your site or app. No built-in form UI in the app—you build the form elsewhere and POST to the URL.
            </p>
            <ul>
              <li><strong>Create / edit</strong> — Name, form type (embed/popup/etc., for your reference), success message, redirect URL, optional &quot;add to group&quot;, optional &quot;trigger automation&quot;.</li>
              <li><strong>Submit URL</strong> — <code className="break-all">POST /api/forms/&#123;id&#125;/submit</code>. Body: <code>email</code> (required), optional <code>name</code>, <code>data</code> or <code>custom_fields</code>. Creates or updates subscriber, records submission, adds to group and/or triggers automation if configured.</li>
              <li><strong>Copy URL</strong> — Use the button on each form card to copy the full submit URL for your front end.</li>
            </ul>
          </section>

          <section id="bookings" className="manual-section">
            <h2 className="manual-section-heading">Bookings</h2>
            <p>
              <Link href="/bookings" className="text-(--accent) hover:underline font-medium">Bookings</Link> is the Cal.com-style scheduling side: event types, availability, and invitee booking.
            </p>
            <ul>
              <li><strong>Event types</strong> — Define what can be booked: name, slug, duration, description, location, buffer, booking limits, confirmation mode, reminders. Set weekly availability and overrides; optional vacation blocks and Google Calendar sync.</li>
              <li><strong>Booking questions</strong> — Add questions (text, select, etc.) and optional conditional show logic.</li>
              <li><strong>Public booking</strong> — Invitees go to a URL (e.g. /book/your-slug), pick a slot, fill the form, and get a confirmation (and optional calendar file). Reminders are sent by the system.</li>
              <li><strong>Cancel / reschedule</strong> — Cancel and reschedule flows with optional tokens and redirects; rate limiting and audit log for safety.</li>
              <li><strong>Embed</strong> — Configure embed type and styling for embedding the booking page on your site.</li>
            </ul>
            <p className="text-sm text-muted-dim">Payments (Stripe/PayPal) require external setup; without them you can still mark event types as paid and use internal/mock payment state.</p>
          </section>

          <section id="profile" className="manual-section">
            <h2 className="manual-section-heading">Profile</h2>
            <p>
              <Link href="/profile" className="text-(--accent) hover:underline font-medium">Profile</Link> holds your booking profile: username, timezone, bio, social links, branding, custom domain, SEO, and embed options. This is the face of your public booking page.
            </p>
            <p className="text-sm text-muted-dim">Change display name, timezone, and branding so invitees see consistent info when booking.</p>
          </section>

          <section id="workers" className="manual-section">
            <h2 className="manual-section-heading">Backend workers (cron)</h2>
            <p>Some features rely on periodic API calls. Call these from a scheduler (e.g. cron or a hosted job runner):</p>
            <ul>
              <li><strong>POST /api/workers/process-automation-delays</strong> — Resumes automation runs after delay steps.</li>
              <li><strong>POST /api/workers/process-scheduled-campaigns</strong> — Sends campaigns whose <code>scheduled_at</code> is in the past.</li>
              <li><strong>POST /api/workers/process-booking-reminders</strong> — Sends due booking reminder emails.</li>
            </ul>
            <div className="manual-callout">
              <p className="manual-callout-title">Tip</p>
              <p className="text-sm text-muted mb-0">Run these endpoints every 1–5 minutes in production so automations and scheduled campaigns run on time.</p>
            </div>
          </section>

          <a href="#" className="manual-back-top">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            Back to top
          </a>
        </main>
      </div>
    </div>
  );
}
