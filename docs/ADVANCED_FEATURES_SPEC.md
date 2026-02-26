# Advanced Features (Outside MailerLite) — Spec vs Implementation

This document maps **Advanced Features** that go beyond typical MailerLite scope to the current codebase and outlines implementation status and next steps.

---

## 1. Multi-Channel (SMS / WhatsApp)

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **SMS / WhatsApp channels** | ❌ Not started | No SMS or WhatsApp integration. Automations are email-only (step type `email`). |
| **Multi-channel automations** | ❌ | Would need step types `sms`, `whatsapp`; subscriber has phone field or channel-specific identifier; provider (Twilio, etc.) for send. |

**Suggested implementation:**  
- **Subscriber:** Add `phone` (optional); or separate Channel (subscriber_id, channel_type, address).  
- **Step types:** Add `sms`, `whatsapp`; payload template + provider config.  
- **Providers:** Integrate Twilio (or similar) for SMS; WhatsApp Business API for WhatsApp.  
- **Triggers:** Entry points for “SMS received”, “WhatsApp message” if inbound is supported.  
- **Conditions/Actions:** “If channel = email”, “Send SMS”, “Send WhatsApp”.

---

## 2. Lead Scoring

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Lead scoring** | ❌ Not started | No score or score history on subscriber. |

**Suggested implementation:**  
- **Subscriber:** Add `score` (integer) and optionally `score_updated_at`.  
- **Scoring rules:** Model or config (e.g. “+10 if opened campaign”, “+5 if clicked”, “-20 if unsubscribed”); run in background or on event.  
- **API:** GET subscriber with score; PATCH to set score manually; GET /api/segments or filters by score range.  
- **Automation:** Trigger or condition “score above X” / “score changed”.

---

## 3. AI Subject Line Testing & Text Generation

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **AI subject line testing** | ❌ Not started | No A/B subject or AI-generated variants. |
| **AI text generation** | ❌ | No integration with LLM for body or subject. |

**Suggested implementation:**  
- **Subject testing:** Extend campaign to support multiple subject variants; send split; winner by open rate (needs open tracking).  
- **AI:** Optional integration (OpenAI, etc.): “Generate subject lines” or “Generate body from prompt”; store as draft; user edits and sends.  
- **API:** POST /api/campaigns/{id}/generate-subjects (prompt) → return list; user picks or runs A/B.

---

## 4. Visual Journey Analytics (Automation Preview)

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **User in queue / specific user journey** | ⚠️ Partial | **Done:** AutomationRun stores current_step, status; can query “runs for automation X” and “run for subscriber Y”. **Missing:** No UI “journey view” (visual flow with subscriber position); no “subscribers in queue” per step. |
| **Visual journey in automations preview** | ❌ | No flowchart or funnel visualization of automation with counts per step or “users here”. |

**Suggested implementation:**  
- **API:** GET /api/automations/{id}/runs (with filters: status, step); GET /api/automations/{id}/stats (counts per step: entered, completed, waiting at step N).  
- **UI:** Automation editor or detail page: diagram of steps (boxes + arrows); overlay counts or “subscribers at this step”; click to list subscribers. Optional: “View as subscriber” (pick subscriber, show their run state and timeline).  
- **Data:** Already have runs; aggregate by current_step and status for stats.

---

## 5. Versioning (Rollback Automations)

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Versioning / rollback automations** | ❌ Not started | Automation and steps are current state only; no history or version snapshots. |

**Suggested implementation:**  
- **AutomationVersion model:** automation_id, version_number, name, trigger_type, steps (JSON snapshot), created_at, created_by. On each PATCH that changes name/steps, create a new version.  
- **API:** GET /api/automations/{id}/versions; POST /api/automations/{id}/rollback (body: version_id) → copy that version’s steps (and optionally name/trigger) back to Automation and steps.  
- **UI:** “Version history” list; “Restore this version” button.

---

## 6. Sandbox / Test Mode

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Test email design** | ⚠️ Partial | **Done:** Resend sandbox redirect (RESEND_SANDBOX_REDIRECT) for local testing so all emails go to one address. No “preview in sandbox” toggle in UI. |
| **Version control** | ❌ | No campaign/email versioning (see Versioning above for automations). |
| **Responsiveness testing** | ❌ | No in-app “preview on device” or responsive preview; user would use external tools or browser. |

**Suggested implementation:**  
- **Sandbox mode (account or campaign):** If “test mode” is on, send only to a test list or sandbox redirect; don’t touch real subscribers.  
- **Email versioning:** Optional CampaignRevision model (campaign_id, subject, html_body, created_at); “Preview this version” and “Restore”.  
- **Responsiveness:** Link to Litmus/Email on Acid or embed iframe with preview URL; or simple “desktop / mobile” toggle that resizes preview pane.

---

## 7. One-Word Reply Automation Triggers

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **One word reply automation triggers** | ❌ Not started | No inbound email handling. Automation trigger “reply with keyword” is in AUTOMATIONS_SPEC; requires parsing inbound replies. |

**Suggested implementation:**  
- **Inbound email:** Webhook or endpoint that receives “email received” from provider (e.g. Resend inbound, SendGrid inbound parse); parse body for keyword/regex.  
- **Trigger:** automation trigger_type `reply_keyword`; trigger_config { keyword or phrase, match_type }. On inbound, find subscriber by from-email, match keyword, start automation run.  
- Covered in AUTOMATIONS_SPEC (reply contains exact word/phrase/regex); this is the same feature with emphasis on “one word”.

---

## 8. Update Fields via Bulk Selection

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Update fields via bulk selection** | ⚠️ Partial | **Done:** POST /api/subscribers/bulk-update with subscriber_ids and name/status. **Missing:** No custom fields yet; no UI “select multiple, then update field X to Y”. |

**Suggested implementation:**  
- Once **custom fields** exist: extend bulk-update API to accept field_slug + value (or map of field_slug → value).  
- **UI:** Subscriber list with checkboxes; “Bulk actions” → “Update field” → pick field and value; call bulk-update with selected ids and field payload.  
- **Segments:** Optional “Update all in segment” (resolve segment to ids, then bulk-update).

---

## 9. Webhooks & Integrations (Zapier Stand-in)

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Outbound webhooks** | ✅ Partial | **Done:** Event bus + WebhookSubscription; emit on subscriber.created, campaign.sent, automation.entered/completed; POST to subscribed URLs. See FEATURE_MAP “Implemented in this pass”. |
| **Inbound webhooks** | ⚠️ Partial | **Done:** POST /api/automations/{id}/trigger with subscriber_id (manual/API). **Missing:** Generic “inbound webhook” that accepts payload from Zapier/Make and can create subscriber, trigger automation, update field, etc. |
| **Integrations (get info from other tools)** | ❌ | No prebuilt connectors (e.g. “Sync from Shopify”). Inbound webhook + docs can stand in for Zapier: “Send POST to this URL with this payload to create subscriber / trigger automation”. |

**Suggested implementation:**  
- **Inbound webhook endpoint:** POST /api/inbound/webhook (or /api/zapier) with auth (e.g. API key in header); body: action (create_subscriber, trigger_automation, update_field), payload. Validate and execute; return JSON.  
- **Docs:** Document payload shape and auth so users can wire Zapier/Make/n8n to “Webhook by Zapier” → this URL.  
- **Optional:** Prebuilt “Zapier-like” app directory (e.g. “Connect to Google Sheets”) that is just a documented webhook + optional OAuth for that tool.

---

## 10. Automated Status Based on Behaviour

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Automated status of users based on behaviour** | ❌ Not started | Subscriber status is manual or set by unsubscribe/bounce flows. No rule like “if no open in 90 days → mark inactive” or “if clicked 3 times → lead”. |

**Suggested implementation:**  
- **Rules or automation:** Define rules (e.g. “if subscriber has not opened any campaign in 90 days, set status to inactive” or “if score > 80 set tag Hot”).  
- **Options:** (1) Cron job that evaluates rules and updates subscriber status/fields/tags; (2) automation trigger “scheduled” that runs daily and applies rules; (3) “Lifecycle” or “Status rules” config (JSON or model) that worker processes.  
- **Requires:** Open/click tracking (to know “last open”); optional lead score; custom fields/tags.  
- **Subscriber:** Optional `lifecycle_status` or reuse status + “inactive” value; or store “last_activity_at” and derive.

---

## Summary Table

| Feature | Status | Notes |
|---------|--------|-------|
| SMS / WhatsApp (multi-channel) | ❌ | |
| Lead scoring | ❌ | |
| AI subject line / text generation | ❌ | |
| Visual journey analytics (automation) | ⚠️ | Data exists (runs); no UI or stats API |
| Versioning / rollback automations | ❌ | |
| Sandbox / test mode | ⚠️ | Resend sandbox redirect only |
| One-word reply triggers | ❌ | Needs inbound email |
| Bulk update fields (selection) | ⚠️ | Bulk update exists; no custom fields |
| Webhooks & integrations | ⚠️ | Outbound done; inbound generic missing |
| Automated status by behaviour | ❌ | |

---

## Implementation Order (Recommended)

1. **Automation runs API + stats** — GET runs for automation, counts per step; enables journey UI and “subscribers in queue”.
2. **Inbound webhook** — Generic POST endpoint for create subscriber / trigger automation / update field; document for Zapier/Make.
3. **Versioning automations** — Snapshot on change; rollback endpoint.
4. **Bulk update fields** — Once custom fields exist; extend bulk-update and add UI.
5. **Lead scoring** — Score field + rules or event-based updates.
6. **Automated status by behaviour** — Cron or lifecycle rules using last_activity/open data.
7. **Visual journey UI** — Diagram + counts + “view subscribers at step”.
8. **SMS/WhatsApp** — Step types + provider integration.
9. **AI generation** — Optional API integration for subject/body.
10. **Sandbox mode** — Account-level or campaign-level test flag; one-word reply after inbound email is built.

---

## File Reference (Current)

| Area | Files |
|------|--------|
| Event bus + webhooks (outbound) | See FEATURE_MAP; event_bus, webhook subscriptions |
| Automation runs | `app/models/automation.py` (AutomationRun) |
| Bulk update | `app/routers/subscribers.py` (POST bulk-update) |
| Resend sandbox | `app/config.py`, `app/services/resend_service.py` |

This spec document should be updated as each item is implemented.
