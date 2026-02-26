# Feature Map — Email Automation Agent

Repository audit: what exists vs. missing (MailerLite + in-house booking spec).

---

## Where is the implementation? (Plan vs done)

Your plan had **8 priority areas**. Here is what was **actually implemented** and where it lives; the rest is **not built yet**.

| # | Plan item | Status | Where implemented |
|---|-----------|--------|--------------------|
| 1 | **Automation engine upgrades** | ✅ Partial | **Done:** Delay execution (worker queue), run state (`paused`, `completed_at`, `error_message`, status `waiting`). **Not done:** Extra triggers (campaign_opened, etc.), conditions, wait_until/jump_to/webhook actions. **Files:** `app/models/automation.py`, `app/services/automation_service.py`, `app/routers/workers.py`, migration `002_*`. |
| 2 | **Booking state machine + slot locking** | ❌ Not started | No booking/calendar code. |
| 3 | **Dynamic segments** | ❌ Not started | No segment model or rule builder. |
| 4 | **Event bus + webhooks** | ❌ Not started | No event bus, no webhook subscriptions or outbound calls. |
| 5 | **Dashboard analytics** | ✅ Partial | **Done:** `GET /api/dashboard/summary` (counts, 7d stats, runs_waiting, recent campaigns/subscribers). **Not done:** System alerts, activity log, quick action endpoints, underperforming detector. **Files:** `app/routers/dashboard.py`, registered in `app/main.py`. |
| 6 | **Forms conditional logic** | ❌ Not started | No form model or API. |
| 7 | **Team scheduling** | ❌ Not started | No booking/team code. |
| — | **Subscriber engine (spec 2.2)** | ✅ Partial | **Done:** Status `bounced`/`suppressed`, consent columns (`consent_ip`, `consented_at`, `source_form_id`). **Not done:** Activity timeline, segments, bulk field update. **Files:** `app/models/subscriber.py`, migration `003_*`. |

**Summary:** Only **priority 1 (automation)** and **priority 5 (dashboard summary)** were partially implemented, plus **subscriber status/consent**. The rest of the plan (booking, segments, event bus, webhooks, forms, team scheduling, alerts, activity log, etc.) has **no implementation** in this repo.

---

## Implementation roadmap (one by one)

Yes — all remaining features can be implemented **one by one**. Each step is additive (new models, endpoints, services) and does not require rewriting existing code. Suggested order (dependencies first, then high-value):

| Order | Feature | Scope (what to add) |
|-------|---------|---------------------|
| 1 | **Event bus + webhooks** | In-memory or DB event store; emit `subscriber.created`, `campaign.sent`, etc.; webhook subscription model + outbound POST on events. Other features can then “emit events” and “subscribe via webhook”. |
| 2 | **Automation: more triggers & actions** | Trigger types: `api_trigger`, `campaign_opened` (after open tracking), `field_updated`. Step types: `condition`, `webhook_call`, `wait_until` (reuse delay), `jump_to`. |
| 3 | **Open/click tracking** | Event table (campaign_id, subscriber_id, event_type, at); tracking pixel + link redirect endpoints; store on send. Unlocks campaign_opened trigger and analytics. |
| 4 | **Dashboard: alerts + activity log** | Alert config model (type, enabled); activity_log table (actor, action, entity, at); API for list + quick actions (duplicate_campaign, resume_automation). |
| 5 | **Dynamic segments** | Segment model (name, rules JSON); rule types (field op, behavioral, time); evaluate as query in service; filter campaign/automation audiences by segment_id. |
| 6 | **Subscriber: activity timeline + bulk update** | SubscriberActivity table (subscriber_id, event_type, payload, at); API GET timeline, PATCH bulk field update. |
| 7 | **Campaign: personalization + conditional blocks** | Replace `{{field}}` in subject/html from subscriber; optional conditional block parser (render_if) in body. |
| 8 | **Forms** | Form model (steps, fields); form_submission model; POST submit API; double_opt_in flow; source_form_id on subscriber. |
| 9 | **In-house booking** | EventType, Availability, Slot, Booking models; booking state machine; GET available slots; POST book (with slot lock); cancellation/reschedule. |
| 10 | **Slot locking + conflicts** | Temporary lock table (slot_id, expires_at); atomic book; check internal + external busy. |
| 11 | **Team scheduling** | Team, Member; round_robin or pool; collective availability. |
| 12 | **Email infra** | SendingDomain, SuppressionList, BounceEvent; rate_limit_config; wire Resend webhooks for bounces. |

Use this as a checklist: implement **1** first (event bus + webhooks), then **2**, **3**, and so on. Each step can be a separate PR and migration.

---

## Implemented without external accounts (this pass)

All of the following work without requiring the user to create or configure any external account or service.

| Feature | What was added |
|---------|----------------|
| **Event bus + webhooks** | `Event` and `WebhookSubscription` models; `emit()` stores event and POSTs to subscribed URLs in background; events: `subscriber.created`, `campaign.sent`, `automation.entered`, `automation.completed`. API: `GET/POST/PATCH/DELETE /api/webhooks`. |
| **Activity log** | `ActivityLog` and `SystemAlert` models; `log_activity()`; wired on subscriber create, campaign send, automation enter. API: `GET /api/dashboard/activity`. |
| **Quick actions** | `POST /api/campaigns/{id}/duplicate`, `POST /api/automations/{id}/resume`. |
| **Campaign personalization** | `{{name}}`, `{{email}}`, `{{id}}` replaced in subject and html per subscriber when sending. |
| **Subscriber activity timeline** | `SubscriberActivity` model; logged on subscriber create. API: `GET /api/subscribers/{id}/activity`. |
| **Bulk update** | `POST /api/subscribers/bulk-update` with `subscriber_ids`, optional `name`/`status`. |
| **Dynamic segments** | `Segment` model (name, rules JSON); `evaluate_segment()` applies rules (field/op/value). API: `CRUD /api/segments`, `GET /api/segments/{id}/subscriber-ids`. |
| **Tracking + subscriber_activities** | `TrackingEvent` and `SubscriberActivity` tables (migrations 006–007); ready for open/click tracking later. |

Migrations: 004 (event_bus, webhook_subscriptions), 005 (activity_logs, system_alerts), 006 (tracking_events, subscriber_activities), 007 (segments).

---

## 1. Backend structure

| Item | Status | Notes |
|------|--------|------|
| FastAPI app, CORS, health | ✅ | `app/main.py` |
| Routers (subscribers, campaigns, automations) | ✅ | `/api/subscribers`, `/api/campaigns`, `/api/automations` |
| Models (Subscriber, Campaign, Automation, steps, runs) | ✅ | `app/models/` |
| Services (campaign, automation, resend) | ✅ | `app/services/` |
| Database (SQLAlchemy, Alembic) | ✅ | `app/database.py`, `alembic/` |
| Background workers / queue | ⚠️ | No Celery/RQ; delay processor via `POST /api/workers/process-automation-delays` (cron) |

---

## 2. Subscriber engine (Contact Database)

**Full spec vs implementation:** see **[docs/SUBSCRIBERS_SPEC.md](docs/SUBSCRIBERS_SPEC.md)** (core model, custom fields, groups/tags, segments, activity timeline, import/export, API/webhooks).

| Item | Status | Notes |
|------|--------|------|
| Model: id, email, name, status, created_at | ✅ | `app/models/subscriber.py` |
| Status enum (active, unsubscribed, bounced, suppressed) | ✅ | `app/models/subscriber.py` |
| CRUD + import API | ✅ | `app/routers/subscribers.py` |
| Consent metadata (ip, timestamp, source_form_id) | ✅ | Columns in migration 003; API not extended |
| Source (form, import, API, automation) | ⚠️ | source_form_id only; no full source enum |
| updated_at / last_activity_at | ❌ | |
| Activity timeline API | ✅ | GET /api/subscribers/{id}/activity; logging partial |
| Custom fields | ❌ | |
| Groups / tags | ❌ | |
| Dynamic segments (AND/OR, behavioral, time-based) | ⚠️ | Basic field rules in segment_service; no AND/OR, behavioral, time |
| Bulk field update | ✅ | POST /api/subscribers/bulk-update (name, status) |
| Import: field mapping, update existing | ❌ | |
| Export by segment/group/filter | ❌ | |

---

## 3. Campaign system (Broadcast Email)

**Full spec vs implementation:** see **[docs/CAMPAIGNS_SPEC.md](docs/CAMPAIGNS_SPEC.md)** (campaign types, editor, sending controls, targeting, analytics).

| Item | Status | Notes |
|------|--------|------|
| Model: name, subject, html_body, status, sent_at | ✅ | `app/models/campaign.py` |
| Send via Resend, CampaignRecipient | ✅ | `app/services/campaign_service.py` |
| Personalization tokens {{name}}, {{email}}, {{id}} | ✅ | `_personalize()` in campaign_service |
| Batch send (chunks of 100) | ✅ | |
| Duplicate campaign | ✅ | POST /api/campaigns/{id}/duplicate |
| Conditional content blocks | ❌ | |
| {{first_name}}, {{custom_field}} | ❌ | |
| Send to segment_id / group / exclusions | ❌ | Only recipient_ids or “all active” |
| Schedule send | ❌ | |
| Open/click tracking | ❌ | TrackingEvent table exists; no pixel/redirect |
| Campaign analytics (open rate, click rate, etc.) | ❌ | Dashboard placeholders only |
| Campaign PATCH/update | ❌ | |
| Re-send to non-openers | ❌ | |
| A/B test, RSS, plain-text | ❌ | |

---

## 4. Automation engine (Workflow – most important)

**Full spec vs implementation:** see **[docs/AUTOMATIONS_SPEC.md](docs/AUTOMATIONS_SPEC.md)** (triggers, conditions, actions, delay logic, controls).

| Item | Status | Notes |
|------|--------|------|
| Automation, AutomationStep, AutomationRun, PendingAutomationDelay | ✅ | `app/models/automation.py` |
| Trigger: subscriber_added | ✅ | Wired on subscriber create/import |
| Trigger: manual / API | ✅ | POST /api/automations/{id}/trigger with subscriber_id |
| Step types: email, delay | ✅ | Worker processes delays via process_due_automation_delays |
| Run state: current_step, status, paused, completed_at, error_message | ✅ | |
| Enable/disable workflow (is_active) | ✅ | PATCH, resume endpoint |
| Triggers: group join/leave, field updated, form submitted, campaign opened/clicked, date-based, reply | ❌ | |
| Conditions (if/else, AND/OR, field/tag/activity/time) | ❌ | |
| Actions: update field, add/remove group, jump, end, trigger automation, webhook | ❌ | Only email + delay |
| Wait until condition / smart delay / wait until date | ❌ | Only fixed delay |
| View subscribers in automation (runs API) | ❌ | |
| Step-level analytics, error handling (retry, on_failure) | ❌ | |

---

## 5. Forms & Capture System

**Full spec vs implementation:** see **[docs/FORMS_SPEC.md](docs/FORMS_SPEC.md)** (form types, builder, submission handling, tracking).

| Item | Status | Notes |
|------|--------|------|
| Form model / API | ❌ | No form or form field model yet |
| Subscriber.source_form_id | ✅ | Ready for form attribution |
| Dashboard forms_performance | ⚠️ | Placeholder (views/submissions/rate = 0) |
| Form types (embedded, popup, slide-in, landing, multi-step) | ❌ | |
| Form builder (drag-drop, validation, hidden, conditional) | ❌ | |
| Styling / branding / mobile | ❌ | |
| Submit: create/update subscriber, add to group, trigger automation | ❌ | |
| Redirect URL, success message, double opt-in | ❌ | |
| Tracking: views, submissions, conversion rate, source attribution | ❌ | |

---

## 6. Booking (in-house)

**Availability Engine (global availability + calendar sync):** see **[docs/AVAILABILITY_ENGINE_SPEC.md](docs/AVAILABILITY_ENGINE_SPEC.md)**.

| Item | Status | Notes |
|------|--------|------|
| Event types (name, slug, duration, location, buffer, limits) | ✅ | `app/models/booking.py`, event types API + UI (create/edit). |
| Default weekly availability (per event type) | ✅ | `Availability` table; UI: `/bookings/availability` grid. |
| Timezone (per event type, booking profile) | ✅ | `EventType.timezone`, `BookingProfile.timezone`. |
| Date overrides (available/unavailable, custom times) | ✅ | `AvailabilityOverride`; API + UI in event type edit. |
| Vacation blocks | ❌ | Not implemented; spec in AVAILABILITY_ENGINE_SPEC. |
| Temporary availability blocks | ⚠️ | Covered by overrides with custom start/end time; no separate “block” type. |
| Calendar sync (Google, Outlook, Apple) | ❌ | Not implemented; spec in AVAILABILITY_ENGINE_SPEC. |
| Conflict detection (internal bookings) | ✅ | Overlapping bookings rejected; calendar shows busy. |
| Real-time busy slot blocking (external calendars) | ❌ | Depends on calendar sync. |
| Team scheduling, round robin members | ✅ | `EventTypeMember`; list/add/remove; assignment on book. |
| Slot generation, bookings CRUD | ✅ | `app/routers/bookings.py`, frontend bookings + availability pages. |
| Embedding (iframe, popup, etc.) | ❌ | |

---

## 7. Dashboard

| Item | Status | Notes |
|------|--------|------|
| Dashboard UI (stats, recent, quick actions) | ✅ | `frontend/src/app/page.tsx` — uses list APIs |
| Dashboard summary API | ✅ | `GET /api/dashboard/summary` in `app/routers/dashboard.py` |
| System alerts (sending_paused, domain_error, etc.) | ❌ | |
| Recent activity log | ❌ | |
| Quick action endpoints (duplicate_campaign, resume_automation) | ❌ | |
| Underperforming campaign detector | ❌ | No open/click data |

---

## 8. Email infrastructure (System-level)

**Full spec vs implementation:** see **[docs/EMAIL_INFRASTRUCTURE_SPEC.md](docs/EMAIL_INFRASTRUCTURE_SPEC.md)** (sending domains, SPF/DKIM/DMARC, bounce, suppression, rate limiting, abuse).

| Item | Status | Notes |
|------|--------|------|
| Resend send + config (API key, from, sandbox) | ✅ | `app/services/resend_service.py`, `app/config.py` |
| Subscriber status: bounced, suppressed | ✅ | Filtered from sends; counts in dashboard |
| Sending domains (in-app, multi-domain) | ❌ | Single from-address only |
| SPF / DKIM / DMARC setup / status | ❌ | Resend handles externally; no in-app surface |
| Bounce handling (auto-update from webhook) | ❌ | No Resend webhook ingestion |
| Suppression list (global, Resend sync) | ❌ | Only per-subscriber status |
| Rate limiting (configurable throttle) | ❌ | Chunked batch only |
| Abuse detection (alerts, metrics) | ❌ | |

---

## 9. Webhooks / event bus

| Item | Status | Notes |
|------|--------|------|
| Event bus (internal events) | ❌ | |
| Webhook subscriptions / outbound | ❌ | |
| Resend webhooks (delivery, open, click) | ❌ | |

---

## 10. Analytics

| Item | Status | Notes |
|------|--------|------|
| Analytics API | ❌ | No `/api/analytics/*` |
| Open/click storage, aggregation | ❌ | |

---

## 11. User / Team Management (Optional)

**Full spec vs implementation:** see **[docs/USER_TEAM_SPEC.md](docs/USER_TEAM_SPEC.md)** (multiple users, roles & permissions, audit logs, account-level settings).

| Item | Status | Notes |
|------|--------|------|
| Multiple users | ❌ | No User model or auth |
| Roles & permissions | ❌ | |
| Audit logs | ⚠️ | ActivityLog exists; no user/actor on mutations |
| Account-level settings | ⚠️ | Config only; no DB-backed per-account settings |

---

## 12. Advanced Features (outside MailerLite)

**Full spec vs implementation:** see **[docs/ADVANCED_FEATURES_SPEC.md](docs/ADVANCED_FEATURES_SPEC.md)** (multi-channel, lead scoring, AI, journey analytics, versioning, sandbox, one-word reply, bulk fields, webhooks/integrations, automated status).

| Item | Status | Notes |
|------|--------|------|
| SMS / WhatsApp (multi-channel automations) | ❌ | |
| Lead scoring | ❌ | |
| AI subject line testing & text generation | ❌ | |
| Visual journey analytics (queue / user journey) | ⚠️ | Run data exists; no stats API or UI |
| Versioning / rollback automations | ❌ | |
| Sandbox / test mode (design, version, responsiveness) | ⚠️ | Resend sandbox redirect only |
| One-word reply automation triggers | ❌ | Needs inbound email |
| Update fields via bulk selection | ⚠️ | Bulk-update exists; no custom fields yet |
| Webhooks & integrations (Zapier stand-in) | ⚠️ | Outbound webhooks done; inbound generic missing |
| Automated status based on behaviour | ❌ | |

---

## Implementation priority (from spec)

1. **Automation engine upgrades** — delay processing, run state (paused, completed_at), then more triggers/conditions
2. **Booking state machine + slot locking** — new domain
3. **Dynamic segments**
4. **Event bus + webhooks**
5. **Dashboard analytics** — summary endpoint, alerts stub
6. **Forms conditional logic**
7. **Team scheduling**
8. **User / Team Management (optional)** — see [docs/USER_TEAM_SPEC.md](docs/USER_TEAM_SPEC.md) (users, roles, audit, settings)
9. **Advanced features (outside MailerLite)** — see [docs/ADVANCED_FEATURES_SPEC.md](docs/ADVANCED_FEATURES_SPEC.md) (multi-channel, lead scoring, AI, journey UI, versioning, webhooks, etc.)
10. **Event Types (core booking engine)** — see [docs/EVENT_TYPES_SPEC.md](docs/EVENT_TYPES_SPEC.md) (basic settings, availability rules, booking limits; current vs spec).

---

## Implemented in this pass (no breaking changes)

- **FEATURE_MAP.md** — This audit document.
- **Automation run state**: `AutomationRun` now has `paused`, `completed_at`, `error_message`; status may be `waiting` when in a delay.
- **PendingAutomationDelay** model and table: queue for delay steps with `execute_after`; worker processes due rows.
- **Delay execution**: `run_automation_for_subscriber` enqueues a delay step and sets status to `waiting`; `process_due_automation_delays(db)` resumes runs. Existing sync flow unchanged when no delay steps.
- **Worker endpoint**: `POST /api/workers/process-automation-delays?max_processed=100` for cron/scheduler to process due delays.
- **Dashboard summary**: `GET /api/dashboard/summary` returns totals (subscribers, campaigns, drafts, automations), 7d counts, `runs_waiting`, and recent campaigns/subscribers.
- **Subscriber status**: Enum extended with `bounced`, `suppressed`; optional consent fields `consent_ip`, `consented_at`, `source_form_id` (migration 003).
- **Migrations**: `002_automation_run_state_and_pending_delays.py`, `003_subscriber_status_and_consent.py`.
