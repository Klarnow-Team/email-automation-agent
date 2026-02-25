# User / Team Management (Optional) — Spec vs Implementation

This document maps the **User / Team Management (Optional)** specification to the current codebase and outlines implementation status and next steps.

---

## 1. Multiple Users

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Multiple users** | Not started | App is single-tenant / single-user: no User model, no login, no session. All API is unauthenticated. |

**Suggested implementation:**
- **User model:** id, email, password_hash (or OAuth only), name, created_at, last_login_at.
- **Account/Tenant (optional):** If multi-tenant, add Account model; User belongs to Account; data scoped by account_id.
- **Auth:** JWT or session-based login; register/login endpoints; protect API with auth dependency.
- **Frontend:** Login page, store token, send Authorization header.

---

## 2. Roles & Permissions

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Roles & permissions** | Not started | No role or permission model. |

**Suggested implementation:**
- **Role model:** id, name (e.g. admin, editor, viewer), account_id.
- **Permission:** Role-based or permission-based (e.g. campaigns.send, subscribers.export).
- **User.role_id** or UserRole (user_id, role_id).
- **Middleware:** Check permission before each endpoint; UI hide/disable by role.

---

## 3. Audit Logs

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Audit logs** | Partial | ActivityLog exists for system activity (subscriber.created, campaign.sent). No user/actor; no "who did what" for PATCH/DELETE. |

**Suggested implementation:**
- **AuditLog model:** id, user_id (nullable), action, entity_type, entity_id, payload (JSON), ip_address, created_at.
- Log on all mutating actions; include user_id from auth.
- **API:** GET /api/audit-logs (filter by user, entity, date).
- **UI:** Activity / Audit page with table and filters.

---

## 4. Account-Level Settings

| Spec | Status | Implementation / Notes |
|------|--------|------------------------|
| **Account-level settings** | Partial | App config in app/config.py (Resend, CORS). No per-account settings in DB. |

**Suggested implementation:**
- **Settings model:** account_id (or global), key-value or JSON (default_from_email, timezone).
- **API:** GET/PATCH /api/settings.
- **UI:** Settings page (general, sending, notifications).

---

## Summary Table

| Feature | Status | Notes |
|---------|--------|-------|
| Multiple users | Not started | No User model or auth |
| Roles & permissions | Not started | |
| Audit logs | Partial | ActivityLog exists; no user/actor on mutations |
| Account-level settings | Partial | Config only; no DB-backed settings |

---

## Implementation Order (Recommended)

1. **User model + auth** — User; register/login; JWT or session; protect API.
2. **Audit logs** — AuditLog with user_id, action, entity; log on create/update/delete; list API.
3. **Account + multi-tenant (optional)** — Account; scope data by account_id.
4. **Roles & permissions** — Role; permission middleware; restrict routes.
5. **Account settings** — Settings model; GET/PATCH API; settings UI.

---

## File Reference (Current)

| Area | Files |
|------|--------|
| Activity log (system) | app/routers/dashboard.py, ActivityLog model |
| Config | app/config.py |

**To add:** User model, auth router, auth dependency, AuditLog model, optional Account/Role, settings model and API.
