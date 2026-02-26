# Availability Engine — Spec & Implementation Status

This document specifies the **Availability Engine**: global availability (weekly hours, timezone, overrides, vacation/temporary blocks) and **Calendar Sync** (Google, Outlook, Apple, conflict detection, busy-slot blocking).

---

## 1. Global Availability

### 1.1 Default weekly hours

| Item | Status | Notes |
|------|--------|------|
| **Per-event-type weekly schedule** | ✅ Done | `Availability` table: `event_type_id`, `day_of_week` (0–6), `start_time`, `end_time`. Multiple blocks per day supported. |
| **UI: weekly grid (click to toggle)** | ✅ Done | `/bookings/availability` — select event type, set blocks per day. |
| **Global default (account-level)** | ❌ Not started | No “default weekly hours” shared across event types; each type has its own. Optional: add `default_availability` on a future Account/Profile and copy when creating event type. |

### 1.2 Timezone setting

| Item | Status | Notes |
|------|--------|------|
| **Timezone per event type** | ✅ Done | `EventType.timezone` (e.g. `America/New_York`). Used in slot generation. |
| **Booking profile timezone** | ✅ Done | `BookingProfile.timezone` + `timezone_auto_detect`. |
| **Invitee timezone** | ⚠️ Partial | Slot API can accept timezone; display in invitee’s TZ is app responsibility. |

### 1.3 Date overrides

| Item | Status | Notes |
|------|--------|------|
| **Override specific dates (available/unavailable)** | ✅ Done | `AvailabilityOverride`: `event_type_id`, `override_date`, `is_available`, optional `start_time`/`end_time`. |
| **API** | ✅ Done | List/create/delete overrides per event type. |
| **UI** | ✅ Done | Edit event type → “Date overrides” section (add/remove by date). |

### 1.4 Vacation blocks

| Item | Status | Notes |
|------|--------|------|
| **Vacation (date range, fully unavailable)** | ❌ Not started | **Proposed:** `VacationBlock` (or `AvailabilityBlock` with `block_type=vacation`): `team_member_id` or `event_type_id`, `start_date`, `end_date`, optional `reason`. Slot generation excludes these ranges. |
| **UI** | ❌ | Settings or availability page: “Add vacation”, pick range; list/delete. |
| **Scope** | — | Can be per team member (affects all their event types) or per event type. |

### 1.5 Temporary availability blocks

| Item | Status | Notes |
|------|--------|------|
| **One-off “available only this window”** | ⚠️ Partial | `AvailabilityOverride` with `is_available=true` and `start_time`/`end_time` can represent a single-day custom window. |
| **Named “temporary block” (e.g. “Extra hours 12–3pm next Tuesday)** | ❌ Not started | Same as override; no separate model. Could add a `label` or use overrides as-is. |
| **Recurring temporary (e.g. “Every Sat 9–12 for next 4 weeks”)** | ❌ Not started | Would require either multiple overrides or a new “recurring override” model. |

**Summary (Global Availability):** Default weekly hours and timezone and date overrides are implemented. Vacation blocks and explicit “temporary availability blocks” (beyond overrides) are not yet implemented.

---

## 2. Calendar Sync

### 2.1 Supported providers

| Provider | Status | Notes |
|----------|--------|------|
| **Google Calendar** | ❌ Not started | OAuth2, Calendar API; store refresh token per connection. |
| **Outlook / Microsoft 365** | ❌ Not started | OAuth2, Microsoft Graph; store refresh token. |
| **Apple Calendar** | ❌ Not started | CalDAV or OAuth (where available); or “subscribe via URL” (read-only). |
| **Multiple calendar sync** | ❌ Not started | One or more connections per team member or per event type; merge busy events from all. |

### 2.2 Data model

| Model | Status | Purpose |
|-------|--------|---------|
| **CalendarConnection** | ✅ Done | `id`, `team_member_id`, `provider`, `email`, `refresh_token`, `sync_enabled`, `last_synced_at`, `created_at`. |
| **CalendarEvent** (cache) | ❌ Optional | On-demand fetch from Google Freebusy is used; cache can be added later for performance. |

### 2.3 Conflict detection

| Item | Status | Notes |
|------|--------|------|
| **Internal conflicts** | ✅ Done | Overlapping bookings rejected; calendar shows existing bookings as busy. |
| **External calendar conflicts** | ❌ Not started | When generating slots: fetch busy windows from connected calendars and exclude those times. Requires Calendar Sync to be implemented. |

### 2.4 Real-time busy slot blocking

| Item | Status | Notes |
|------|--------|------|
| **Block slots that are busy in external calendar** | ✅ Done | Slot generation: (1) weekly + overrides + vacation; (2) subtract internal bookings; (3) fetch external busy via Freebusy and subtract. |
| **Refresh frequency** | ✅ On-demand | Busy windows are fetched when `GET /api/event-types/{id}/available-slots` is called (no cache). |

**Summary (Calendar Sync):** No calendar sync is implemented yet. To implement: add `CalendarConnection` (and optionally `CalendarEvent` cache), OAuth flows per provider, background sync or on-demand fetch, and integrate “busy windows” into the existing slot-generation path.

---

## 3. Implementation roadmap (Availability Engine)

Suggested order:

| Order | Feature | Scope |
|-------|---------|--------|
| 1 | **Vacation blocks** | New table `vacation_blocks` (or `availability_blocks` with type). API: CRUD per team_member or event_type. Slot generation: exclude date ranges. UI: add/remove on availability or profile. |
| 2 | **Temporary availability (clarify)** | Use existing `AvailabilityOverride` with custom times; optionally add `label`. No new table. |
| 3 | **Calendar connection model + API** | Tables: `calendar_connections`, optionally `calendar_events`. API: list connections, connect (return OAuth URL), callback, disconnect. No slot integration yet. |
| 4 | **Google Calendar OAuth + fetch busy** | OAuth2 flow, store token, fetch busy intervals for a date range; expose as “busy windows” in API. |
| 5 | **Slot generation: exclude external busy** | In `GET /api/.../slots` (or equivalent), merge external busy windows and filter slots. |
| 6 | **Outlook / Apple** | Same pattern as Google; provider-specific OAuth and API. |
| 7 | **Multiple calendars per member/type** | Already in model if multiple rows per `team_member_id`; merge busy from all. |
| 8 | **Real-time vs cached** | Decide: cache with TTL + background job vs on-demand fetch; add webhooks if needed. |

---

## 4. Where it lives in the codebase

| Area | Current |
|------|---------|
| **Weekly availability** | `app/models/booking.py` (`Availability`), `app/routers/bookings.py`, `frontend/.../bookings/availability/page.tsx` |
| **Date overrides** | `AvailabilityOverride` in `booking.py`; API under event types; UI in event type edit. |
| **Timezone** | `EventType.timezone`, `BookingProfile.timezone` |
| **Slot generation** | Implemented in bookings router; overlap check with existing bookings. |
| **Vacation / calendar** | Not yet; add under `app/models/` and `app/routers/` (e.g. `availability.py` or extend `bookings.py`). |

This spec should be used as the single reference for the Availability Engine and Calendar Sync when implementing the items above.
