# Automations — Workflow Engine (Spec vs Implementation)

This document maps the **Automations (Workflow Engine)** specification to the current codebase and outlines implementation status and next steps. This area is marked as **most important** in the product spec.

---

## 1. Automation Structure

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Trigger → Steps → Conditions → Actions → Exit** | ⚠️ Partial | **Done:** Trigger (single type per automation), linear Steps (email, delay). **Missing:** Conditions as first-class steps or gates; branching; explicit Exit step; Actions beyond email/delay. |

**Current model:** `Automation` (trigger_type, is_active) → `AutomationStep[]` (order, step_type, payload) → execution creates `AutomationRun` (current_step, status, paused, error_message). No condition nodes or action types like “add to group”, “webhook”, “jump”.

---

## 2. Triggers (Entry Points)

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Subscriber joins group** | ❌ Not started | No groups model. When added: emit event on add-to-group; automation trigger_type `subscriber_joined_group` (with group_id in trigger_config). |
| **Subscriber leaves group** | ❌ Not started | Same as above; trigger_type `subscriber_left_group`. |
| **Custom field updated** | ❌ Not started | No custom fields. When added: emit on field update; trigger_type `field_updated` (optional field_slug filter). |
| **Field equals / contains keyword** | ❌ Not started | Could be trigger filter (e.g. only enter if field X contains Y) or condition inside workflow. |
| **Form submitted** | ❌ Not started | No form model. When added: trigger_type `form_submitted` (form_id in config). |
| **Campaign link clicked** | ❌ Not started | Depends on click tracking; trigger_type `campaign_link_clicked` (campaign_id, optional link/url). |
| **Campaign opened / not opened** | ❌ Not started | Depends on open tracking; trigger_type `campaign_opened`, `campaign_not_opened` (campaign_id). |
| **Date based (birthday, anniversary)** | ❌ Not started | Would need cron/scheduler to evaluate “subscribers whose date field = today (or ±N days)”; trigger_type `date_based` with field_slug and rule. |
| **API trigger** | ⚠️ Partial | **Done:** `POST /api/automations/{id}/trigger` with subscriber_id (manual/API). No generic “API key + automation name” trigger. **Add:** e.g. webhook endpoint that accepts subscriber identifier and automation id/name. |
| **Manual trigger** | ✅ Done | Same as API trigger; UI or API calls trigger with subscriber_id. |
| **Subscriber replies to email with keyword** | ❌ Not started | Would need inbound email/reply handling; parse body for keyword; trigger_type `reply_keyword`. |
| **Reply contains exact word / phrase / regex / sentiment** | ❌ Not started | Same as above; config for match type and value. |

**Suggested implementation order:** Keep subscriber_added and manual/API trigger. Add trigger types as events become available: campaign_opened / campaign_link_clicked (after tracking), form_submitted (after forms), subscriber_joined_group (after groups), field_updated (after custom fields). Store trigger config (e.g. campaign_id, group_id) in Automation table (JSONB trigger_config) or new column(s).

---

## 3. Conditions (Logic Gates)

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **If / else** | ❌ Not started | No condition step type. Would need step_type `condition` with predicate (field, op, value) and optional else_branch (next step index or branch steps). |
| **Nested conditions, AND/OR** | ❌ Not started | Condition payload could be tree: `{ "and": [ {...}, {...} ] }` or `{ "or": [...] }`. |
| **Compare: field values, tags, group membership** | ❌ Not started | Depends on custom fields and groups. Condition evaluator would check subscriber state. |
| **Workflow activity (opened, clicked, replied)** | ❌ Not started | Depends on tracking + stored activity; condition “subscriber opened campaign X”. |
| **Campaign activity** | ❌ Not started | Same. |
| **Time conditions** (within X hours/mins, after delay) | ⚠️ Partial | “After delay” exists as delay step. “Within X hours” would be a condition (e.g. “if current time is within 2h of subscriber’s timezone 9am”). |
| **Channel-specific** (email replied, SMS replied, link clicked) | ❌ Not started | Would be condition types once channels and tracking exist. |

**Suggested implementation:** Introduce step_type `condition` with payload describing one or more predicates (field, op, value; or activity checks). Execution: evaluate condition; go to step A if true, step B if false (store next_step_if_true / next_step_if_false in payload or use order). Later add AND/OR and nested conditions in payload.

---

## 4. Actions

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Send email** | ✅ Done | Step type `email`; payload subject, html. Sent via Resend. |
| **Update custom field** | ❌ Not started | No custom fields. When added: step_type `update_field`; payload field_slug, value. |
| **Add/remove from group** | ❌ Not started | No groups. When added: step_type `add_to_group`, `remove_from_group`; payload group_id. |
| **Add/remove tag** | ❌ Not started | Same as groups/tags model. |
| **Delay / wait** | ✅ Done | Step type `delay`; payload delay_minutes. Uses PendingAutomationDelay and worker. |
| **Wait until condition met** | ❌ Not started | Would be step_type `wait_until`; worker or cron re-evaluates until condition true, then continues. Complex (polling or event-driven). |
| **Jump to step** | ❌ Not started | Step type `jump`; payload step_index or step_id. Execution sets current_step and continues. |
| **End automation** | ⚠️ Partial | Reached implicitly when no more steps. **Add:** explicit step_type `end` or “end workflow” action. |
| **Trigger another automation** | ❌ Not started | Step type `trigger_automation`; payload automation_id. Call run_automation_for_subscriber for target automation. |
| **Webhook / API call** | ❌ Not started | Step type `webhook`; payload url, method, headers, body template. Execute HTTP request; optionally continue on success/failure. |
| **Internal notification** | ❌ Not started | Step type `notification`; payload (e.g. email to internal team, or in-app). |
| **Assign owner (CRM-style)** | ❌ Not started | Would need “owner” or “assignee” on subscriber or lead; step_type `assign_owner`; payload user_id. |

**Suggested implementation order:** Jump to step → End (explicit) → Trigger another automation → Webhook → Add/remove from group (when groups exist) → Update custom field (when custom fields exist). Wait until condition met is a larger feature (re-evaluation loop or event-driven).

---

## 5. Delay Logic

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Fixed delay** | ✅ Done | Delay step with delay_minutes. |
| **Smart delay (best open time)** | ❌ Not started | Would need “best time” per subscriber (e.g. from history or timezone); schedule execute_after accordingly. |
| **Wait until: field changes** | ❌ Not started | Event-driven: when field updated, check runs in “wait_until” and resume if condition met. |
| **Wait until: reply received** | ❌ Not started | Inbound reply handling; match run (e.g. by email thread) and resume. |
| **Wait until: link clicked** | ❌ Not started | Click tracking event; match run and resume. |
| **Wait until: date reached** | ❌ Not started | Delay step could support “execute_after” as specific datetime (e.g. “next Monday 9am”); or new step type “wait_until_date” with payload date expression. |

**Suggested implementation:** Extend delay step payload to allow optional `execute_after` (ISO datetime) instead of only delay_minutes, for “send at specific time”. Smart delay and wait-until-X require more infra (events, re-evaluation).

---

## 6. Automation Controls

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Enable / disable workflow** | ✅ Done | `is_active` on Automation; PATCH to set. Resume endpoint sets is_active=1. |
| **Pause for all or specific subscribers** | ⚠️ Partial | **Done:** Run has `paused` flag; execution checks it and stops. No UI/API to “pause this run” or “pause all runs for this automation”. **Add:** PATCH run to set paused; optional “pause all runs for automation X”. |
| **View subscribers inside automation** | ⚠️ Partial | Runs exist (automation_id, subscriber_id). **Add:** API `GET /api/automations/{id}/runs` or “subscribers in workflow” (list runs with status, current step). |
| **Step-level analytics** | ❌ Not started | No aggregate “how many reached step N”, “how many completed step N”. **Add:** Counts per step (e.g. from runs: current_step >= N or step completion log). |
| **Error handling** (invalid email, missing data) | ⚠️ Partial | **Done:** On email send exception, run marked failed with error_message. **Missing:** Retry policy; skip step and continue; “on error” branch; invalid email handling (e.g. mark subscriber bounced). |

**Suggested implementation:** API to list runs for an automation (with subscriber summary). API to pause/resume a single run. Optional: “pause all” for automation. Step-level counts: query runs grouped by current_step / completed_at and step index. Error handling: optional retry count; optional “on_failure” next step.

---

## Implementation Order (Recommended)

1. **Trigger config** — Add `trigger_config` (JSONB) to Automation for campaign_id, group_id, form_id, etc., when those triggers are added.
2. **New triggers** — Wire campaign_opened / campaign_link_clicked (after tracking); form_submitted (after forms); subscriber_joined_group / left_group (after groups); field_updated (after custom fields). Each trigger type subscribes to events and starts runs.
3. **Condition step** — step_type `condition`; payload with predicate(s); next_step_if_true / next_step_if_false (or step indices). Evaluator for field, status, group membership.
4. **Jump / End** — step_type `jump` (payload step_index), step_type `end`. Execution applies jump or completes run.
5. **Trigger another automation** — step_type `trigger_automation`; call run_automation_for_subscriber for target.
6. **Webhook step** — step_type `webhook`; execute HTTP request; continue.
7. **Runs API** — GET automation runs (and “subscribers in workflow”); PATCH run to pause/resume.
8. **Step analytics** — Counts per step from runs; expose in API and UI.
9. **Add/remove group, update field** — When groups and custom fields exist; add corresponding step types.
10. **Wait until condition / smart delay / reply/link wait** — After event and condition infra is stable.

---

## File Reference (Current)

| Area | Files |
|------|--------|
| Automation models | `app/models/automation.py` (Automation, AutomationStep, AutomationRun, PendingAutomationDelay) |
| Automation API | `app/routers/automations.py` |
| Automation schemas | `app/schemas/automation.py` |
| Execution + delays | `app/services/automation_service.py` |
| Trigger: subscriber_added | Called from `app/services/...` (subscriber create/import); `trigger_automations_for_new_subscriber` |
| Workers (process delays) | `app/routers/workers.py` (e.g. POST process-automation-delays) |
| Frontend automations | `frontend/src/app/automations/page.tsx`, `frontend/src/lib/api.ts` |

This spec document should be updated as each item is implemented.
