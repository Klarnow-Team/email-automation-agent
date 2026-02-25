# System-Level Features — Email Infrastructure (Spec vs Implementation)

This document maps the **System-Level Features (Email Infrastructure)** specification to the current codebase and outlines implementation status and next steps.

---

## 1. Sending Domains

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Sending domains** | ⚠️ Partial | **Done:** Single from-address via config (`RESEND_FROM_EMAIL`, default `onboarding@resend.dev`). Resend handles domain verification externally (https://resend.com/domains). **Missing:** In-app model to store multiple domains; UI to add/verify domains; per-campaign or per-automation domain/sender selection. |
| **SPF / DKIM / DMARC setup** | ❌ Not started | Typically configured at DNS (and/or via Resend when domain is added there). **In-app:** Could store verification status per domain (e.g. sync from Resend API: domain status, SPF/DKIM/DMARC records or status). Expose in UI as “Domain health” or “DNS setup” guide. |

**Suggested implementation:**  
- **Option A (light):** Keep single global from-address; add a “Domains” settings page that shows Resend dashboard link and documents SPF/DKIM/DMARC (or fetches domain list + status from Resend API if available).  
- **Option B (full):** Add `SendingDomain` model (domain, from_email, verified_at, verification_status, resend_domain_id?). CRUD + “verify” action that calls Resend API and updates status. Campaign/Automation can optionally select sending_domain_id. SPF/DKIM/DMARC: display records or status returned by Resend for each domain.

---

## 2. IP Reputation Management

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **IP reputation management** | ❌ Not started | Resend (or provider) manages sending IPs. In-app: no dedicated feature. Could add **read-only** dashboard widget that surfaces Resend’s reputation/health (if API exists) or link to provider dashboard. Optional: store daily/weekly reputation snapshot for alerts. |

**Suggested implementation:** If Resend exposes reputation or IP health via API, add a settings or dashboard section “Sender reputation” and display it. Otherwise document that IP reputation is managed by the provider and link to their docs.

---

## 3. Bounce Handling

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Bounce handling** | ⚠️ Partial | **Done:** Subscriber status `bounced` exists; active subscribers are filtered out when sending (so bounced users don’t receive more). **Missing:** No automatic transition to `bounced` when a bounce event occurs; no ingestion of bounce events from Resend (or webhook). |

**Suggested implementation:**  
- **Resend webhooks:** Configure Resend to send webhooks for `email.bounced` (and optionally `email.delivery_delayed`). Add endpoint `POST /api/webhooks/resend` (or similar) that receives payload, finds subscriber by email, sets status to `bounced` (or `suppressed` per policy), and optionally logs to SubscriberActivity / BounceEvent table.  
- **BounceEvent model (optional):** Store bounce events (subscriber_id, campaign_id?, raw_payload, created_at) for analytics and audit.  
- **UI:** Show bounced count (already in dashboard); optional “Bounces” log or export.

---

## 4. Spam Detection

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Spam detection** | ❌ Not started | No in-app spam scoring or content checks. Provider (Resend) may do some checks. **Possible:** Pre-send content scan (e.g. simple spam-word list, or third-party API); store “spam score” on campaign draft; warn before send. |

**Suggested implementation:** Optional: before campaign send, run simple heuristic or call a spam-check API; store result and show warning. Low priority unless product requirement.

---

## 5. Suppression Lists

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Suppression lists** | ⚠️ Partial | **Done:** Subscriber status `suppressed` (and `bounced`, `unsubscribed`); only `active` subscribers receive campaigns/automations. So “suppression” is effectively per-subscriber status. **Missing:** No global suppression list (e.g. emails that are suppressed regardless of subscriber record); no sync with Resend’s suppression list; no “upload suppression list” or “block list” UI. |

**Suggested implementation:**  
- **Option A:** Keep current model: suppression = subscriber status. Optionally add a **global block list** (e.g. `SuppressionEmail` table: email, reason, source) that is checked before sending in addition to subscriber status.  
- **Option B:** Add `SuppressionList` model (name, type: bounce/complaint/manual) and `SuppressionListEntry` (email or list_id + email). Before any send, check subscriber status and global/list entries.  
- Resend: If Resend has a suppression list API, optionally sync bounces/complaints into app (subscriber status or SuppressionListEntry).

---

## 6. Rate Limiting

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Rate limiting** | ⚠️ Partial | **Done:** Campaign send uses chunked batch (e.g. 100 per batch) to avoid sending everything in one call. **Missing:** No configurable “max emails per minute/hour”; no per-domain or per-account rate limit in app; no throttling between batches. Resend may enforce its own limits. |

**Suggested implementation:**  
- Add config or DB setting: `sending_rate_limit` (e.g. emails per minute). In `campaign_service` (and automation send if applicable), add delay between batches so that effective rate ≤ limit.  
- Optional: rate limit per sending domain or per “channel” (campaign vs automation).  
- Document Resend’s limits and align in-app limit to stay under.

---

## 7. Abuse Detection

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Abuse detection** | ❌ Not started | No automated abuse detection (e.g. sudden spike in sends, complaint rate, bounce rate). Could add: alerts when bounce rate or complaint rate exceeds threshold; or when send volume exceeds X in Y hours. |

**Suggested implementation:**  
- **Alerts:** Use existing or new “system alerts” to define rules: e.g. “bounce_rate > 5% over last 24h”, “complaint_rate > 0.1%”, “sends_per_hour > 10000”. Run in cron or after send; create alert when triggered.  
- **Dashboard:** Show “Health” or “Abuse risk” widget (bounce rate, complaint rate, send volume trend).  
- Depends on: storing bounce/complaint events (see Bounce handling) and send volume (already have CampaignRecipient; add aggregation).

---

## Summary Table

| Feature | Status | Notes |
|---------|--------|------|
| Sending domains (in-app) | ❌ | Single from-address via config; Resend verifies domains externally |
| SPF / DKIM / DMARC | ❌ | No in-app setup; could surface Resend domain status |
| IP reputation | ❌ | Provider-managed; optional read-only widget |
| Bounce handling | ⚠️ | Subscriber status bounced; no webhook ingestion to set it |
| Spam detection | ❌ | None |
| Suppression lists | ⚠️ | Via subscriber status; no global list or Resend sync |
| Rate limiting | ⚠️ | Chunked send only; no configurable throttle |
| Abuse detection | ❌ | None |

---

## Implementation Order (Recommended)

1. **Resend webhooks** — Add endpoint for Resend webhooks (bounce, complaint, delivered). On bounce/complaint: set subscriber status to `bounced`/`suppressed` and log event. This unlocks bounce handling and feeds into abuse metrics.
2. **Rate limit config** — Add `sending_rate_limit` (e.g. per minute); throttle between batches in campaign (and automation) send.
3. **Suppression list (optional)** — Global block list table or sync with Resend suppression list; check before send.
4. **Sending domains (in-app)** — Model + UI to add/verify domains (via Resend API if available); optional per-campaign sender selection.
5. **SPF/DKIM/DMARC** — Surface status from Resend per domain; or static docs/DNS guide.
6. **Abuse detection** — Alerts on bounce/complaint rate or send volume; optional dashboard widget.

---

## File Reference (Current)

| Area | Files |
|------|--------|
| Resend send | `app/services/resend_service.py` |
| Config (from, API key, sandbox) | `app/config.py` |
| Subscriber status (bounced, suppressed) | `app/models/subscriber.py` |
| Campaign send (batch) | `app/services/campaign_service.py` |
| Dashboard (bounced/suppressed counts) | `app/routers/dashboard.py` |

**To add (as needed):** Webhook route for Resend (`app/routers/webhooks.py` or similar), `BounceEvent` / `ComplaintEvent` models, `SendingDomain` model, rate limit config and throttling in send flow, global suppression list model, alert rules for abuse.

This spec document should be updated as each item is implemented.
