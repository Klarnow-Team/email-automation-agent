# Campaigns — Broadcast Email System (Spec vs Implementation)

This document maps the **Campaigns (Broadcast Email System)** specification to the current codebase and outlines implementation status and next steps.

---

## 1. Campaign Types

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Standard newsletter** | ✅ Done | Single campaign: name, subject, html_body; send to recipients. |
| **A/B test campaign** | ❌ Not started | Would need: multiple variants (subject and/or body), split %, winner selection, send winner to rest. |
| **RSS-triggered campaign** | ❌ Not started | Would need: RSS feed config, poll/fetch, trigger send when new items. |
| **Plain-text email** | ⚠️ Partial | Only `html_body` stored; Resend can send HTML. Add optional `plain_text_body` and send multipart. |
| **Re-send to non-openers** | ❌ Not started | Depends on open tracking; then “create campaign from template, target subscribers who received but did not open campaign X”. |

**Suggested implementation order:** Plain-text (optional field + multipart send), then re-send to non-openers (after open tracking), then A/B (variant model + send flow), then RSS (scheduler + feed parser).

---

## 2. Email Editor

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Drag & drop blocks** | ❌ Not started | No block-based editor. Current: raw `html_body` text. Would need block schema (type, props) and render to HTML. |
| **HTML editor** | ✅ Done | Campaign has `html_body`; UI can provide textarea or rich HTML input. |
| **Text editor** | ⚠️ Partial | Same field; no separate “plain only” mode or plain-text-specific UI. |
| **Blocks: Text, Image, Button, Divider, Social, Dynamic content** | ❌ Not started | Would be part of block-based editor (store as JSON blocks, compile to HTML). |
| **Conditional blocks** (show if field = X) | ❌ Not started | Requires block editor + condition DSL; at send time evaluate per subscriber and omit or include block. |
| **Personalization tokens** `{{first_name}}`, `{{custom_field}}` | ⚠️ Partial | `campaign_service._personalize()` replaces `{{name}}`, `{{email}}`, `{{id}}`. **Missing:** `{{first_name}}` (could alias name or split), `{{custom_field}}` (needs custom fields). |

**Current:** Single `html_body` (HTML string). No PATCH for campaign; no dedicated “editor” beyond create form.

**Suggested implementation:**

- Add **Campaign PATCH** (update name, subject, html_body) so drafts can be edited.
- Extend **personalization** to support `{{first_name}}` (e.g. first word of name or name), and when custom fields exist, `{{field_slug}}`.
- **Conditional blocks:** Optional: store body as structured JSON (blocks with optional `show_if`); at send time resolve per subscriber and render to HTML. Otherwise keep HTML and add a simple `{{#if field}}...{{/if}}` parser.
- **Drag & drop / blocks:** Larger feature; consider a block schema (e.g. `{ type: "text"|"image"|"button"|..., props: {...} }`), save as JSON, server renders to HTML for send and preview.

---

## 3. Sending Controls

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Send now** | ✅ Done | `POST /api/campaigns/{id}/send`; immediate send to active subscribers (or provided recipient_ids). |
| **Schedule** | ❌ Not started | No `scheduled_at`; no job to send at time. **Add:** optional `scheduled_at` on campaign or separate ScheduledSend model; cron/worker to send when due. |
| **Time-zone optimized sending** | ❌ Not started | Would need subscriber timezone (e.g. custom field or profile) and per-subscriber send windows. |
| **Throttling / batch sending** | ⚠️ Partial | `campaign_service` sends in chunks of 100; no configurable throttle (e.g. N per minute). **Add:** config or env for batch size / delay between batches. |
| **Domain / sender selection** | ❌ Not started | Resend is used with default from; no per-campaign “from” or domain selection in app. **Add:** campaign `from_email` / `from_name` or use Resend domain API. |

**Suggested implementation:**

- **Schedule:** Add `scheduled_at` (nullable) to Campaign or a `scheduled_sends` table; worker checks and sends when `scheduled_at <= now` and status is draft/scheduled.
- **Throttling:** Add optional delay between batches and/or smaller batch size in config.
- **Sender:** Add optional `from_email` / `from_name` to campaign (or account-level default) and pass to Resend.

---

## 4. Targeting

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Send to: Groups** | ❌ Not started | No groups model. Once groups exist: “recipient_ids = subscribers in group X”. |
| **Send to: Segments** | ⚠️ Partial | No direct “send to segment” in API. **Workaround:** client can call `GET /api/segments/{id}/subscriber-ids` and pass to send. **Add:** `CampaignSendRequest.segment_id` (and optionally group_id, tag filters). |
| **Send to: Tags** | ❌ Not started | No tags; same as groups when implemented. |
| **Exclusions** | ❌ Not started | Only “active” subscribers filtered in service. **Add:** optional exclude list (ids or segment “exclude segment X”). |
| **Suppression lists** | ⚠️ Partial | Subscriber status `suppressed` / `bounced`; active filter already excludes non-active. No separate “suppression list” table (e.g. global email blocks). |
| **Preview by subscriber** | ❌ Not started | **Add:** `GET /api/campaigns/{id}/preview?subscriber_id=Y` returns personalized subject + HTML for that subscriber. |

**Suggested implementation:**

- **Send request:** Extend `CampaignSendRequest` with `segment_id`, `group_ids`, `exclude_subscriber_ids` or `exclude_segment_id`. Resolve to subscriber ids in service (reuse segment evaluation, group membership).
- **Preview:** Endpoint that takes campaign + subscriber_id, runs personalization (and conditional blocks if any), returns JSON `{ subject, html }`.

---

## 5. Campaign Analytics

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Delivery rate** | ⚠️ Partial | Resend may provide delivery events; not stored per recipient. **Add:** store delivery status per CampaignRecipient (e.g. delivered_at, bounce) if Resend webhooks send it. |
| **Open rate** | ❌ Not started | `TrackingEvent` table exists; no tracking pixel or open logging. **Add:** 1x1 pixel in HTML, endpoint that logs open (campaign_id, subscriber_id) and returns image. Then open rate = opens / sent. |
| **Click rate** | ❌ Not started | No link wrapping or click redirect. **Add:** wrap links in redirect URL that logs click then redirects; store in TrackingEvent. |
| **Click map** | ❌ Not started | Depends on click tracking (link_id or URL); then aggregate by link/URL. |
| **Device breakdown** | ❌ Not started | Would need User-Agent or similar in open/click requests; parse and store device category. |
| **Geo breakdown** | ❌ Not started | Would need IP or similar in open/click; geo lookup and store. |
| **Unsubscribe reason** | ❌ Not started | No unsubscribe flow in app (e.g. link that sets status + optional reason). **Add:** unsubscribe link + optional reason form; store reason. |
| **Spam complaint tracking** | ❌ Not started | If Resend webhooks send complaint events, store and surface in analytics. |

**Current:** `CampaignRecipient` has `sent_at` only. `TrackingEvent` exists but is not populated by any tracking endpoints. Dashboard has placeholder campaign performance (opens, clicks, etc.) that can be wired to real data once tracking exists.

**Suggested implementation order:**

1. **Open tracking:** Inject tracking pixel (or optional query param) in HTML; `GET /t/open?c=...&s=...` (or signed) that logs event and returns 1x1 GIF.
2. **Click tracking:** Wrap links in `GET /t/click?c=...&s=...&url=...` that logs and redirects.
3. **Campaign analytics API:** Aggregate by campaign_id: sent count, open count, click count, unique opens/clicks; delivery rate if Resend webhooks provide it.
4. **Unsubscribe:** Unsubscribe link + landing page with optional reason; PATCH subscriber status + store reason (e.g. in SubscriberActivity or UnsubscribeReason table).
5. **Device/geo:** Optional enrichment of TrackingEvent from request headers/IP when logging open/click.

---

## Implementation Order (Recommended)

1. **Campaign PATCH** — Update draft name, subject, html_body.
2. **Personalization** — Add `{{first_name}}`; later `{{custom_field}}` when custom fields exist.
3. **Targeting** — Add `segment_id` (and optionally group_ids, exclusions) to send request; resolve to subscriber ids.
4. **Preview by subscriber** — GET preview endpoint with personalized content.
5. **Open tracking** — Pixel + endpoint; store in TrackingEvent; expose open count in campaign/dashboard.
6. **Click tracking** — Redirect wrapper + endpoint; store in TrackingEvent; click count and click map.
7. **Schedule send** — scheduled_at + worker to send at time.
8. **Re-send to non-openers** — After open tracking: “target subscribers who received campaign X and did not open.”
9. **Unsubscribe flow** — Unsubscribe link + reason; store and report.
10. **A/B tests, RSS, plain-text, throttling, sender selection, device/geo** — As needed.

---

## File Reference (Current)

| Area | Files |
|------|--------|
| Campaign model | `app/models/campaign.py` |
| Campaign API | `app/routers/campaigns.py` |
| Campaign schemas | `app/schemas/campaign.py` |
| Send + personalization | `app/services/campaign_service.py` |
| Tracking (tables) | `app/models/tracking.py` (TrackingEvent, SubscriberActivity) |
| Dashboard campaign stats | `app/routers/dashboard.py` (overview uses placeholder or aggregate data) |
| Frontend campaigns | `frontend/src/app/campaigns/page.tsx`, `frontend/src/lib/api.ts` |

This spec document should be updated as each item is implemented.
