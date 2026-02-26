# Booking & payment webhook events

Your registered webhook URLs receive HTTP POST requests with JSON body:

```json
{
  "event": "booking.created",
  "payload": {
    "booking_id": 1,
    "event_type_id": 1,
    "team_member_id": 2,
    "start_at": "2025-02-18T14:00:00+00:00",
    "end_at": "2025-02-18T14:30:00+00:00",
    "attendee_email": "guest@example.com",
    "attendee_name": "Guest",
    "status": "pending_confirmation"
  }
}
```

## Events

| Event | When |
|-------|------|
| `booking.created` | A new booking is created (pending or confirmed). |
| `booking.confirmed` | Booking status is set to confirmed (e.g. after manual approval or payment). |
| `booking.cancelled` | Booking is cancelled or deleted. |
| `booking.rescheduled` | Start/end time of the booking is changed. |
| `booking.completed` | Booking status is set to completed (event took place). |
| `booking.no_show` | Booking is marked as no-show. |
| `payment.completed` | Payment is recorded for the booking (`paid_at` set). |

Payload always includes at least: `booking_id`, `event_type_id`, `team_member_id`, `start_at`, `end_at`, `attendee_email`, `attendee_name`, `status`.  
`payment.completed` also includes `paid_at` (ISO datetime).

## Booking status model

- **pending_confirmation** – Awaiting host approval or payment.
- **confirmed** – Booked and confirmed.
- **cancelled** – Cancelled.
- **rescheduled** – Time was changed (booking remains confirmed).
- **no_show** – Attendee did not show.
- **completed** – Event finished.
- **refunded** – Payment was refunded (if paid).

## Subscribing

Use **Settings → Webhooks** (or `POST /api/webhooks`) to add a URL and optional `event_types` filter.  
If `event_types` is omitted, the URL receives all events.

## Signing (optional)

Set a `secret` on the webhook subscription. Each request will include a header:

`X-Webhook-Signature: sha256=<hex>`  

where the value is HMAC-SHA256 of the raw JSON body (UTF-8) using the secret. Verify on your endpoint to ensure the request is from Klarnow.

## Retries

Failed deliveries (network errors or 5xx responses) are retried up to 3 times with exponential backoff (1s, 2s).
