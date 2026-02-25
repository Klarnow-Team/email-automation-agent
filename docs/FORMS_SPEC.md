# Forms & Capture System (Spec vs Implementation)

This document maps the **Forms & Capture System** specification to the current codebase and outlines implementation status and next steps.

---

## 1. Form Types

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Embedded form** | ❌ Not started | No form model. Would be: form rendered in iframe or inline script on host site; submit to API. |
| **Pop-up** | ❌ Not started | Same form definition; display mode = popup (JS/CSS). |
| **Slide-in** | ❌ Not started | Display mode = slide-in. |
| **Full landing page** | ❌ Not started | Display mode = full page; form hosted at app URL (e.g. /f/{slug}). |
| **Multi-step form** | ❌ Not started | Form model would have steps/pages; each step has fields; submit per step or at end. |
| **Conditional fields** | ❌ Not started | Field or step has “show if” rule (e.g. field X equals Y); evaluate client-side or server-side on submit. |

**Current:** No form model or API. Subscriber has `source_form_id` (nullable) ready for attribution once forms exist.

**Suggested implementation:** Add `Form` model (name, slug, type/display_mode, settings JSON). Form has many `FormStep` (for multi-step) or single step with fields. `FormField` (step_id or form_id, type, key, label, required, options, conditional_rule). Form types/display modes: embedded, popup, slide_in, landing_page. Multi-step = multiple steps; conditional fields = rule on field (show_if).

---

## 2. Form Builder

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Drag & drop fields** | ❌ Not started | Builder UI: reorder fields (store order in FormField.order); drag & drop is front-end only. |
| **Field validation** | ❌ Not started | Per field: required, type (email, number, date, etc.), pattern, min/max. Validate on submit (API returns validation errors). Optional client-side same rules. |
| **Hidden fields** | ❌ Not started | Field type `hidden`; value can be default or passed in URL/embed params. |
| **Conditional logic** (show field if X) | ❌ Not started | Field has show_if: { field_key, op, value } or expression. Client evaluates for display; server can re-check on submit. |
| **Styling / branding** | ❌ Not started | Form settings: colors, font, button text, CSS overrides, logo URL. Stored in Form.settings or FormTheme. |
| **Mobile optimization** | ❌ Not started | Responsive CSS and viewport; part of default form template/embed script. |

**Suggested implementation:** Form model includes `settings` JSON (theme, success_message, redirect_url, etc.). FormField has type (text, email, number, date, select, checkbox, hidden, etc.), validation (required, pattern, min, max), order, conditional_rule (JSON). API: CRUD forms, CRUD fields (or nested in form payload). Builder UI is separate (React/Vue) with drag-and-drop; saves to same API.

---

## 3. Submission Handling

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Add to group** | ❌ Not started | No groups. When groups exist: form settings “add to group_ids[]”; on submit add subscriber to those groups. |
| **Update fields** | ❌ Not started | Map form fields to subscriber fields (email, name) or custom fields; on submit create/update subscriber. |
| **Trigger automation** | ⚠️ Partial | Subscriber create already triggers `subscriber_added` automations. Form-specific: optional “trigger automation_id” in form settings so only that automation runs (or tag to distinguish form source). |
| **Redirect URL** | ❌ Not started | Form settings redirect_url; after submit return 302 or HTML redirect. |
| **Success message** | ❌ Not started | Form settings success_message; show on same page or in modal after submit. |
| **Double opt-in** | ❌ Not started | Form setting double_opt_in: if true, create subscriber with status “pending_confirmation”; send confirmation email with link; link sets status to active and optionally logs source_form_id. Requires email send and token/link storage. |

**Current:** No form submission endpoint. Subscriber create (and thus automation trigger) exists but is not form-driven with form_id.

**Suggested implementation:** `POST /api/forms/{id_or_slug}/submit` (or public `/f/{slug}/submit`): body = field key/value map. Validate against form fields; create or update subscriber; set source_form_id; add to groups if configured; trigger automation(s) if configured; log FormSubmission (form_id, subscriber_id, payload, created_at). Return redirect_url or success_message. Double opt-in: store pending token, send email, expose endpoint to confirm (e.g. GET /confirm?token=...).

---

## 4. Tracking

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Views** | ❌ Not started | Increment when form is displayed (embed or landing). Either: 1) pixel/script calls `POST /api/forms/{id}/view` or 2) server-rendered landing page counts on load. Store FormView (form_id, at, optional referrer, UTM). |
| **Submissions** | ❌ Not started | On submit, insert FormSubmission; count = submissions. |
| **Conversion rate** | ❌ Not started | views > 0 ? submissions / views : 0. Dashboard already has FormsPerformance (views, submissions, conversion_rate); currently hardcoded 0. Wire to real form stats (e.g. aggregate by form or global). |
| **Source attribution** | ⚠️ Partial | Subscriber.source_form_id exists. **Add:** UTM params or referrer on form view/submit; store in FormSubmission and optionally on Subscriber (utm_source, utm_medium, etc.). |

**Current:** Dashboard `GET /api/dashboard/overview` returns `forms_performance: { views, submissions, conversion_rate }` as placeholders (0). No Form or FormSubmission tables.

**Suggested implementation:** FormView table (form_id, viewed_at, referrer, utm_*). FormSubmission table (form_id, subscriber_id, payload JSON, submitted_at, utm_*). Form model has or uses these for counts. Dashboard overview: sum views and submissions across forms (or per-form if needed); conversion_rate = submissions / views.

---

## Implementation Order (Recommended)

1. **Form model + basic API** — Form (name, slug, display_mode, settings JSON). FormField (form_id, order, type, key, label, required, options, validation). CRUD forms and fields. No multi-step yet (single “step” of fields).
2. **Public submit endpoint** — POST submit with field values; validate; create or update subscriber; set source_form_id; log FormSubmission. Return success message or redirect URL from form settings.
3. **Dashboard wiring** — FormsPerformance from real data: count FormSubmission, FormView (once views tracked); conversion_rate.
4. **Tracking views** — FormView model; endpoint or script to record view (form_id, referrer, utm); call from embed/landing.
5. **Form settings** — redirect_url, success_message, add_to_group_ids (when groups exist), trigger_automation_id. Apply on submit.
6. **Double opt-in** — Setting + pending token + confirmation email + confirm endpoint.
7. **Multi-step** — FormStep model; steps have fields; submit step-by-step or collect and submit at end.
8. **Conditional fields** — show_if on FormField; evaluate in builder and on submit.
9. **Styling / branding** — settings.theme (colors, font, etc.); render in embed/landing template.
10. **Embed / popup / slide-in / landing** — Embeddable script and landing page route; display_mode controls layout.

---

## File Reference (Current)

| Area | Files |
|------|--------|
| Subscriber source_form_id | `app/models/subscriber.py` |
| Dashboard forms placeholder | `app/routers/dashboard.py` (FormsPerformance, forms_views/submissions/rate = 0) |
| Forms (none yet) | — |

**To add:** `app/models/form.py` (Form, FormField, FormStep?, FormSubmission, FormView?), `app/schemas/form.py`, `app/routers/forms.py`, `app/services/form_service.py` (submit logic, validation). Public routes for submit and optionally view/embed.

This spec document should be updated as each item is implemented.
