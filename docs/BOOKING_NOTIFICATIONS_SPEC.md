# Booking Automation & Notification System — Spec & Implementation

## 1. Email Notifications

| Feature | Status | Implementation |
|--------|--------|----------------|
| **Booking confirmation** | ✅ | `send_booking_confirmation_email` in `app/services/booking_confirmation.py`. Sent on create (public + internal) and when status changes to confirmed. Respects `EventType.send_email_confirmation`. |
| **Cancellation email** | ✅ | `send_booking_cancellation_email`. Sent when status set to cancelled (PATCH) or on DELETE booking. |
| **Reschedule confirmation** | ✅ | `send_booking_reschedule_email`. Sent when `start_at`/`end_at` change (PATCH). |
| **Reminder emails** | ✅ | `send_booking_reminder_email`. Sent by worker from `BookingReminder` rows; timing from `EventType.reminder_minutes_before` (JSON array, e.g. `[1440, 60]`). |
| **Host notification** | ✅ | `send_host_notification_email`. Sent to addresses in `EventType.booking_notification_emails` (comma-separated or JSON array) when a booking is created. |
| **Team notification** | ✅ | Same as host: use `booking_notification_emails` for team/host addresses. |

## 2. Reminder Settings

| Feature | Status | Implementation |
|--------|--------|----------------|
| **Custom reminder timing** | ✅ | `EventType.reminder_minutes_before` (e.g. `"[1440, 60]"` for 24h and 1h before). |
| **Multiple reminders** | ✅ | Array of minutes; one `BookingReminder` row per reminder. |
| **SMS reminders** | ⚠️ | Model supports `channel: "sms"`; worker only sends email. SMS would need a provider (e.g. Twilio). |
| **Webhook notification** | ✅ | Event bus emits booking events; webhook subscriptions receive them. |

## 3. Event-Based Triggers (Event Bus)

Events are stored and sent to webhook subscriptions that subscribe to the event type.

| Trigger | Event name | When |
|--------|------------|------|
| **On booking created** | `booking.created` | After create (public or internal). |
| **On booking confirmed** | `booking.confirmed` | When status changes to `confirmed`. |
| **On booking cancelled** | `booking.cancelled` | When status set to cancelled or booking deleted. |
| **On booking rescheduled** | `booking.rescheduled` | When `start_at`/`end_at` change. |
| **On no-show** | `booking.no_show` | When status set to `no_show`. |
| **On payment success/failure** | ❌ | No payment flow yet. |
| **On form submission** | ✅ | Covered by `booking.created` (form is part of public booking). |

Payload (example): `booking_id`, `event_type_id`, `team_member_id`, `start_at`, `end_at`, `attendee_email`, `attendee_name`, `status`.

## 4. Actions

| Action | Status | Notes |
|--------|--------|------|
| **Send email** | ✅ | Confirmation, cancellation, reschedule, reminder, host notification. |
| **Send SMS** | ❌ | Placeholder (`send_sms_confirmation` on EventType); no provider. |
| **Send WhatsApp** | ❌ | Not implemented. |
| **Trigger webhook** | ✅ | Via event bus: subscribe at `GET/POST /api/webhooks` with `event_types` including e.g. `booking.created`. |
| **Add to CRM / Update contact / External automation** | ⚠️ | Implement externally via webhooks (e.g. on `booking.created` call your CRM API). |

## 5. Configuration (Event Type)

- **booking_notification_emails**: Comma-separated or JSON array of emails for host/team notification on new booking.
- **reminder_minutes_before**: JSON array of minutes before start, e.g. `[1440, 60]` for 24h and 1h.

API: `PATCH /api/event-types/{id}` with `booking_notification_emails`, `reminder_minutes_before`.

## 6. Worker

- **POST /api/workers/process-booking-reminders**  
  Processes due `BookingReminder` rows (where `remind_at <= now` and `sent_at IS NULL`), sends reminder email, sets `sent_at`.  
  Call periodically (e.g. every 5–15 minutes) from cron/scheduler.

## 7. Booking Status

- **no_show**: New status. Set via `PATCH /api/bookings/{id}` with `"status": "no_show"`. Emits `booking.no_show`.
