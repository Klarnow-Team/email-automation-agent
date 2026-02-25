# Event Types (Core Booking Engine) — Spec & Implementation Status

Event types are the core objects of the booking engine. This document captures the full specification and maps it to the current codebase.

---

## 1. Basic Settings

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Title** | Done | `EventType.name` (DB + API). UI: event type cards, create form. |
| **Description** | Done | `EventType.description`. API + create event type form. |
| **Duration** (15m, 30m, 1h, custom) | Done | `duration_minutes` + presets (15/30/45/60/90/120) and custom in create form. |
| **Location type** | Done | `location_type` + `location_link`. Options: Google Meet, Zoom, Teams, Phone, In-person, Custom. API + form. |
| **Buffer time** (before/after) | Done | `buffer_before_minutes`, `buffer_after_minutes`. API + form. |
| **Minimum scheduling notice** | Done | `minimum_notice_minutes`. Enforced on POST/PATCH booking. Form. |
| **Date range limits** | Done | `date_range_start_days`, `date_range_end_days`. Enforced on booking. Form (advanced). |
| **Max bookings per day** | Done | `max_bookings_per_day`. Enforced on create booking. Form (advanced). |

---

## 2. Availability Rules

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Weekly schedule** (Mon–Sun time blocks) | Done | `Availability` table: event_type_id, day_of_week, start_time, end_time. UI: availability calendar (click to toggle). |
| **Override specific dates** | Done | `AvailabilityOverride` table + GET/POST/DELETE per event type. API + client; UI for overrides can be added on availability page. |
| **Timezone lock** | Done | `timezone` on EventType. Form (advanced). Slot logic can use it when generating times. |
| **Round robin (team)** | Done | `EventTypeMember` table (event_type_id, team_member_id, sort_order). API: list/add/remove members. Assignment logic on book can use sort_order. |
| **Collective scheduling** | Partial | Same members table; "collective" would need slot aggregation across members — not implemented. |
| **Pooled availability** | Partial | Members table supports pool; pooled slot generation not implemented. |

---

## 3. Booking Limits

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Limit per time slot** | Done | `slot_capacity` (1 = 1:1; >1 = group). Enforced on create/update booking. Form (advanced). |
| **Limit per invitee** | Done | `max_bookings_per_invitee` + `max_bookings_per_invitee_period_days`. Enforced on booking. Form (advanced). |
| **Prevent double booking** | Done | Backend rejects overlapping bookings (any event type). Calendar shows all bookings as red. |
| **Max future bookings** | Done | `max_future_bookings`. Enforced on create/update booking. Form (advanced). |

---

## 4. Current Data Model (Summary)

**EventType** (existing): `id`, `name`, `slug`, `duration_minutes`, `created_at`.

**Availability** (existing): `event_type_id`, `day_of_week`, `start_time`, `end_time`.

**Booking** (existing): `event_type_id`, `team_member_id`, `title`, `start_at`, `end_at`, attendee fields, `status`, `amount`, etc.

---

## 5. Suggested Implementation Order

1. **Basic settings (low risk)**  
   Description, duration presets in UI, location type (enum + optional link), buffer before/after.

2. **Booking limits (medium)**  
   Max bookings per day, minimum scheduling notice, date range limits; enforce in `POST /api/bookings` and in any slot-generation API.

3. **Availability extensions**  
   Override specific dates, timezone per event type.

4. **Team / round robin** (larger)  
   Round robin, collective scheduling, pooled availability — likely need new tables and slot logic.

If you want to implement a specific part first (e.g. description + location type + buffer time), say which section and we can add migrations, API, and UI in one pass.
