# Subscribers — Contact Database Engine (Spec vs Implementation)

This document maps the **Subscriber (Contact Database Engine)** specification to the current codebase and outlines implementation status and next steps.

---

## 1. Subscriber Object (Core Model)

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Email (primary ID)** | ✅ Done | `Subscriber.email` (unique, indexed). |
| **Status** (active, unsubscribed, bounced, suppressed) | ✅ Done | `SubscriberStatus` enum in `app/models/subscriber.py`. |
| **Source** (form, import, API, automation) | ⚠️ Partial | `source_form_id` exists; no enum for import/API/automation. **Add:** `source` column (e.g. `form \| import \| api \| automation`) or derive from existing fields. |
| **Timestamp fields** (created, updated, last activity) | ⚠️ Partial | `created_at` ✅. **Missing:** `updated_at`, `last_activity_at`. |
| **Consent metadata** (IP, time, form) | ✅ Done | `consent_ip`, `consented_at`, `source_form_id` in `app/models/subscriber.py`. API/schemas not fully exposing these. |

**Suggested backend changes:**

- Add `updated_at` (auto on PATCH), `last_activity_at` (set when activity is logged).
- Add `source` (string or enum): `form`, `import`, `api`, `automation`; set on create/import and in API.
- Expose consent fields in `SubscriberResponse` and optional create/update payloads.

---

## 2. Custom Fields

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| Types: Text, Number, Date, Boolean, Dropdown/enum, Hidden, API-only | ❌ Not started | No custom field model. |
| Used for: Personalization, Segmentation, Automation conditions, Workflows | ❌ | Depends on custom fields + segment/automation rule extensions. |

**Suggested implementation:**

- **Model:** `CustomFieldDefinition` (name, slug, type, options for dropdown, visibility: default/hidden/api_only).  
- **Model:** `SubscriberFieldValue` (subscriber_id, field_slug, value_text, value_number, value_date, value_bool, or single JSONB value).  
- **API:** CRUD for definitions; PATCH subscriber to set custom field values; include in `SubscriberResponse`.  
- **Segments:** Extend `segment_service.evaluate_segment()` to support custom field rules (eq, contains, gt, lt, etc.).  
- **Personalization:** Extend campaign send to replace `{{field_slug}}` from subscriber’s custom fields.

---

## 3. Groups / Tags

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| Static membership | ❌ Not started | No group/tag model. |
| Manual or automation-driven | ❌ | Would need Group + SubscriberGroup (M2M); automation steps to add/remove. |
| Use as triggers or filters | ❌ | Segments would need “in group” / “has tag” rules. |

**Suggested implementation:**

- **Model:** `Group` (id, name, slug, type: e.g. `static`).  
- **Model:** `SubscriberGroup` (subscriber_id, group_id, added_at, added_by: manual/automation/import).  
- **API:** CRUD groups; add/remove subscribers to/from groups; list subscribers in group.  
- **Segments:** Add rule type `in_group` / `not_in_group` (and tag if tags are separate or same as groups).  
- **Automation:** Step types “add_to_group”, “remove_from_group”; trigger “added_to_group”.

---

## 4. Segments (Dynamic Queries)

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| Logical rules: field equals / contains / starts with | ✅ Partial | `segment_service.evaluate_segment()` supports status, email, name with eq, ne, contains, startswith. |
| AND / OR logic | ❌ | Rules are applied as implicit AND. **Add:** rules as tree: `{ "and": [ {...}, {...} ] }` or `{ "or": [...] }`. |
| Behavioral: opened campaign, clicked link, did not open, completed form | ❌ | No behavioral tables wired. **Requires:** tracking (opens/clicks) and form submissions; then segment rules like `opened_campaign_id`, `clicked_link_in_campaign`, `completed_form_id`. |
| Time-based: within last X days, before/after date | ❌ | **Add:** rule types for `created_at`, `updated_at`, `last_activity_at` (e.g. within_days, before_date, after_date). |
| Segments auto-update in real time | ✅ | Evaluation is on-demand (no materialized list); each segment fetch runs the query. |

**Suggested implementation:**

- Extend segment `rules` JSON schema to support `and` / `or` and nested conditions.  
- Add behavioral rule types once open/click tracking and form submissions exist.  
- Add time-based rule types in `evaluate_segment()` (e.g. filter by `Subscriber.created_at`, `last_activity_at`).  
- Optionally add “segment preview” (count) API without storing results.

---

## 5. Subscriber Activity Timeline

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| Campaigns received | ⚠️ Partial | `CampaignRecipient` exists; not yet logged as activity. Can derive from DB. |
| Opens / clicks | ❌ | `TrackingEvent` table exists; not populated by tracking pixel/redirect. Need tracking endpoints + logging to `SubscriberActivity`. |
| Automation steps passed | ⚠️ Partial | Automation runs exist; could log “step completed” to `SubscriberActivity`. |
| Forms submitted | ❌ | No form model yet. When added, log `form.submitted`. |
| Field changes | ❌ | Not logged. **Add:** on subscriber PATCH, log `subscriber.updated` with changed fields. |
| Unsubscribe events | ❌ | **Add:** on status → unsubscribed, log `subscriber.unsubscribed` (with optional campaign_id/link if from link). |

**Current:** `SubscriberActivity` model and `GET /api/subscribers/{id}/activity` exist; currently only `subscriber.created` is logged.

**Suggested implementation:**

- Log activity for: campaign sent to subscriber, automation entered/step completed, subscriber updated, unsubscribed.  
- When open/click tracking is implemented, log opens/clicks to `SubscriberActivity` (or keep in `TrackingEvent` and join in timeline API).  
- Timeline API can merge `SubscriberActivity` + `TrackingEvent` (and form submissions later) ordered by time.

---

## 6. Import / Export

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| CSV import | ⚠️ Partial | API: `POST /api/subscribers/import` with JSON array. No CSV upload endpoint (frontend could parse CSV and send JSON). |
| Field mapping | ❌ | Import accepts only email + name. **Add:** map CSV columns to email, name, custom fields, groups, source. |
| Update existing subscribers | ❌ | Import currently skips existing emails. **Add:** option `update_existing: true` and map columns to updatable fields. |
| Trigger automations on import (optional) | ⚠️ Partial | New subscribers from import already trigger “subscriber added” automations. Option to “run automation on import” could be per-import flag. |
| Export by segment, group, or filter | ❌ | No export API. **Add:** `GET /api/subscribers/export?segment_id=&group_id=&format=csv` (and filter by status, etc.). |

**Suggested implementation:**

- Add `POST /api/subscribers/import-csv` (multipart file) or keep client-side CSV parse and extend `POST /api/subscribers/import` with `field_mapping` and `update_existing`.  
- Add export endpoint: accept segment_id, group_id, status; return CSV or JSON; include core + custom fields.

---

## 7. API / Webhooks

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| Create / update subscribers | ✅ Done | `POST /api/subscribers`, `PATCH /api/subscribers/{id}`. |
| Update custom fields | ❌ | Blocked on custom fields implementation. |
| Add/remove from groups | ❌ | Blocked on groups implementation. |
| Fire automations externally | ⚠️ Partial | `POST /api/automations/{id}/trigger` with subscriber_id exists. No generic “trigger by name” or webhook-triggered automation. |
| Webhooks for: Subscribe, Unsubscribe, Field update, Automation entry/exit | ✅ Partial | Event bus + webhook subscriptions exist. Events emitted: `subscriber.created`, `campaign.sent`, `automation.entered`, `automation.completed`. **Missing:** `subscriber.unsubscribed`, `subscriber.updated` (field update), automation exit. |

**Suggested implementation:**

- Emit `subscriber.updated` and `subscriber.unsubscribed` from subscriber router; document payload for webhook consumers.  
- Once custom fields and groups exist: expose in API and emit events on change.  
- Optional: public “inbound webhook” URL to create subscriber and optionally trigger an automation (e.g. by automation name or tag).

---

## Implementation Order (Recommended)

Implement in this order to minimize rework and unlock features step by step:

1. **Core subscriber fields** — Add `updated_at`, `last_activity_at`, `source`; expose consent in API. (Small migration + schema changes.)
2. **Activity timeline** — Log more event types (campaign sent, automation steps, subscriber updated, unsubscribed); optionally merge tracking events in timeline response.
3. **Segments: AND/OR + time-based** — Extend rules JSON and `evaluate_segment()`; add time-based and possibly “in group” once groups exist.
4. **Custom fields** — Definitions + values tables, API, segment support, personalization.
5. **Groups/tags** — Models, API, segment rules “in group”, automation steps add/remove from group.
6. **Import/export** — Field mapping, update existing, CSV export by segment/group/filter.
7. **Behavioral segments** — After open/click tracking and forms exist; add segment rules for opened/clicked/form completed.
8. **Webhooks** — Emit `subscriber.updated`, `subscriber.unsubscribed`; add any inbound webhook for “subscribe + trigger” if required.

---

## File Reference (Current)

| Area | Files |
|------|--------|
| Subscriber model | `app/models/subscriber.py` |
| Subscriber API | `app/routers/subscribers.py` |
| Subscriber schemas | `app/schemas/subscriber.py` |
| Segment model | `app/models/segment.py` |
| Segment evaluation | `app/services/segment_service.py` |
| Segment API | `app/routers/segments.py` |
| Activity (tracking) | `app/models/tracking.py` (SubscriberActivity, TrackingEvent) |
| Event bus / webhooks | See FEATURE_MAP.md (event bus, webhook subscriptions) |
| Frontend subscribers | `frontend/src/app/subscribers/page.tsx`, `frontend/src/lib/api.ts` |

This spec document should be updated as each item is implemented.
