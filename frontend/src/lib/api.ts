// Use same base in browser and server so API calls hit the FastAPI backend (e.g. localhost:8000).
// Set NEXT_PUBLIC_API_URL in .env to override (e.g. "" if you use Next.js rewrites to proxy /api).
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function baseUrl(): string {
  const b = API_BASE.replace(/\/$/, "");
  return b || "";
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const url = baseUrl() ? `${baseUrl()}${path}` : path;
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(
      typeof err.detail === "string" ? err.detail : JSON.stringify(err)
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type Subscriber = {
  id: number;
  email: string;
  name: string | null;
  status: string;
  custom_fields?: Record<string, string> | null;
  created_at: string;
  group_ids?: number[];
  tag_ids?: number[];
};

export type Campaign = {
  id: number;
  name: string;
  subject: string;
  html_body: string;
  plain_body?: string | null;
  status: string;
  sent_at: string | null;
  scheduled_at?: string | null;
  ab_subject_b?: string | null;
  ab_html_body_b?: string | null;
  ab_split_percent?: number | null;
  ab_winner?: string | null;
  created_at: string;
  sent_count?: number;
  opens?: number;
  clicks?: number;
};

export type AutomationStep = {
  id: number;
  automation_id: number;
  order: number;
  step_type: string;
  payload: Record<string, unknown> | null;
};

export type Automation = {
  id: number;
  name: string;
  trigger_type: string;
  is_active: boolean;
  created_at: string;
  steps: AutomationStep[];
};

export const subscribersApi = {
  list: (skip = 0, limit = 100) =>
    api<Subscriber[]>(`/api/subscribers?skip=${skip}&limit=${limit}`),
  create: (body: { email: string; name?: string; custom_fields?: Record<string, string> }) =>
    api<Subscriber>("/api/subscribers", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  get: (id: number) => api<Subscriber>(`/api/subscribers/${id}`),
  update: (id: number, body: { name?: string; status?: string; custom_fields?: Record<string, string> }) =>
    api<Subscriber>(`/api/subscribers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (id: number) =>
    api<void>(`/api/subscribers/${id}`, { method: "DELETE" }),
  import: (body: { email: string; name?: string }[]) =>
    api<Subscriber[]>("/api/subscribers/import", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export const campaignsApi = {
  list: (skip = 0, limit = 100) =>
    api<Campaign[]>(`/api/campaigns?skip=${skip}&limit=${limit}`),
  create: (body: {
    name: string;
    subject: string;
    html_body: string;
    plain_body?: string | null;
    scheduled_at?: string | null;
    ab_subject_b?: string | null;
    ab_html_body_b?: string | null;
    ab_split_percent?: number;
  }) =>
    api<Campaign>("/api/campaigns", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  get: (id: number) => api<Campaign>(`/api/campaigns/${id}`),
  update: (id: number, body: Partial<Pick<Campaign, "name" | "subject" | "html_body" | "plain_body" | "scheduled_at" | "ab_subject_b" | "ab_html_body_b" | "ab_split_percent" | "ab_winner">>) =>
    api<Campaign>(`/api/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  send: (id: number, body: { recipient_ids?: number[] }) =>
    api<{ sent: number; message: string }>(`/api/campaigns/${id}/send`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getNonOpenerSubscriberIds: (id: number) =>
    api<{ subscriber_ids: number[]; count: number }>(`/api/campaigns/${id}/non-opener-subscriber-ids`),
  duplicate: (id: number) =>
    api<Campaign>(`/api/campaigns/${id}/duplicate`, { method: "POST" }),
  delete: (id: number) =>
    api<void>(`/api/campaigns/${id}`, { method: "DELETE" }),
};

export type DashboardOverview = {
  subscriber_counts: {
    total: number;
    active: number;
    unsubscribed: number;
    bounced: number;
    suppressed: number;
  };
  campaign_performance: {
    emails_sent: number;
    delivered: number;
    opens: number;
    clicks: number;
    unsubscribes: number;
    spam_complaints: number;
  };
  automation_performance: {
    active_automations: number;
    subscribers_in_automations: number;
    emails_queued: number;
    emails_sent_via_automation: number;
  };
  forms_performance: { views: number; submissions: number; conversion_rate: number };
  revenue: {
    campaign_revenue: number;
    automation_revenue: number;
    per_subscriber_value: number;
  };
  last_sent_campaign_id: number | null;
};

export type DashboardActivityItem = {
  id: number;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  payload: Record<string, unknown> | null;
  created_at: string | null;
};

export type DashboardAlertItem = {
  id: number;
  alert_type: string;
  enabled: boolean;
  last_triggered_at: string | null;
};

export type BookingOverview = {
  upcoming_bookings: number;
  total_bookings: number;
  cancellations: number;
  reschedules: number;
  revenue: number;
  payments_enabled: boolean;
  time_range: string;
  booking_trends: Array<{ date: string; count: number }>;
  event_type_performance: Array<{ id: number; name: string; slug: string; bookings_count: number }>;
  today_schedule: Array<{
    id: number;
    title: string;
    start_at: string;
    end_at: string;
    attendee_name: string | null;
    attendee_email: string | null;
    status: string;
  }>;
  pending_confirmations: Array<{
    id: number;
    event_type_name: string;
    attendee_email: string | null;
    requested_at: string;
  }>;
  team_booking_load: Array<{ member_id: number; member_name: string; bookings_count: number }>;
};

export type AtAGlance = {
  subscribers: number;
  campaigns: number;
  drafts: number;
  automations: number;
  active_automations: number;
  event_types: number;
  segments: number;
  webhooks: number;
  upcoming_bookings: number;
  pending_confirmations: number;
};

export type RecentBookingItem = {
  id: number;
  event_type_name: string;
  start_at: string;
  end_at: string;
  attendee_name: string | null;
  attendee_email: string | null;
  status: string;
};

export const dashboardApi = {
  getSummary: () => api<{
    total_subscribers: number;
    total_campaigns: number;
    campaigns_sent: number;
    drafts: number;
    total_automations: number;
    active_automations: number;
    new_subscribers_7d: number;
    campaigns_sent_7d: number;
    runs_waiting: number;
    recent_campaigns: Array<{ id: number; name: string; subject: string; status: string; sent_at: string | null; created_at: string | null }>;
    recent_subscribers: Array<{ id: number; email: string; name: string | null; status: string; created_at: string | null }>;
  }>("/api/dashboard/summary"),
  getAtAGlance: () => api<AtAGlance>("/api/dashboard/at-a-glance"),
  getRecentBookings: (limit = 8) =>
    api<RecentBookingItem[]>(`/api/dashboard/recent-bookings?limit=${limit}`),
  getActivity: (skip = 0, limit = 50) =>
    api<DashboardActivityItem[]>(`/api/dashboard/activity?skip=${skip}&limit=${limit}`),
  getOverview: () => api<DashboardOverview>("/api/dashboard/overview"),
  getSubscriberGrowth: (period: "7d" | "30d" = "7d") =>
    api<Array<{ date: string; count: number }>>(`/api/dashboard/subscriber-growth?period=${period}`),
  getAlerts: () => api<DashboardAlertItem[]>("/api/dashboard/alerts"),
  getBookingOverview: (range: "7d" | "30d" | "90d" = "30d") =>
    api<BookingOverview>(`/api/dashboard/booking-overview?range=${range}`),
};

export type Segment = {
  id: number;
  name: string;
  rules: unknown[] | null;
  created_at: string;
};

export const segmentsApi = {
  list: () => api<Segment[]>("/api/segments"),
  get: (id: number) => api<Segment>(`/api/segments/${id}`),
  create: (body: { name: string; rules?: unknown[] }) =>
    api<Segment>("/api/segments", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id: number, body: { name?: string; rules?: unknown[] }) =>
    api<Segment>(`/api/segments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (id: number) =>
    api<void>(`/api/segments/${id}`, { method: "DELETE" }),
  getSubscriberIds: (id: number) =>
    api<{ subscriber_ids: number[]; count: number }>(
      `/api/segments/${id}/subscriber-ids`
    ),
};

export type Group = {
  id: number;
  name: string;
  created_at: string;
  subscriber_count?: number;
};

export const groupsApi = {
  list: () => api<Group[]>("/api/groups"),
  get: (id: number) => api<Group>(`/api/groups/${id}`),
  create: (body: { name: string }) =>
    api<Group>("/api/groups", { method: "POST", body: JSON.stringify(body) }),
  update: (id: number, body: { name?: string }) =>
    api<Group>(`/api/groups/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id: number) => api<void>(`/api/groups/${id}`, { method: "DELETE" }),
  getSubscriberIds: (id: number) =>
    api<{ subscriber_ids: number[] }>(`/api/groups/${id}/subscriber-ids`),
  setSubscribers: (id: number, body: { subscriber_ids: number[] }) =>
    api<{ subscriber_ids: number[] }>(`/api/groups/${id}/subscribers`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  addSubscriber: (groupId: number, subscriberId: number) =>
    api<{ message: string }>(`/api/groups/${groupId}/subscribers/${subscriberId}`, { method: "POST" }),
  removeSubscriber: (groupId: number, subscriberId: number) =>
    api<void>(`/api/groups/${groupId}/subscribers/${subscriberId}`, { method: "DELETE" }),
};

export type Tag = {
  id: number;
  name: string;
  created_at: string;
  subscriber_count?: number;
};

export const tagsApi = {
  list: () => api<Tag[]>("/api/tags"),
  get: (id: number) => api<Tag>(`/api/tags/${id}`),
  create: (body: { name: string }) =>
    api<Tag>("/api/tags", { method: "POST", body: JSON.stringify(body) }),
  update: (id: number, body: { name?: string }) =>
    api<Tag>(`/api/tags/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id: number) => api<void>(`/api/tags/${id}`, { method: "DELETE" }),
  getSubscriberIds: (id: number) =>
    api<{ subscriber_ids: number[] }>(`/api/tags/${id}/subscriber-ids`),
  setSubscribers: (id: number, body: { subscriber_ids: number[] }) =>
    api<{ subscriber_ids: number[] }>(`/api/tags/${id}/subscribers`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  addSubscriber: (tagId: number, subscriberId: number) =>
    api<{ message: string }>(`/api/tags/${tagId}/subscribers/${subscriberId}`, { method: "POST" }),
  removeSubscriber: (tagId: number, subscriberId: number) =>
    api<void>(`/api/tags/${tagId}/subscribers/${subscriberId}`, { method: "DELETE" }),
};

export type SuppressionEntry = {
  id: number;
  type: string;
  value: string;
  created_at: string;
};

export const suppressionApi = {
  list: () => api<SuppressionEntry[]>("/api/suppression"),
  add: (body: { type: "email" | "domain"; value: string }) =>
    api<SuppressionEntry>("/api/suppression", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  remove: (id: number) => api<void>(`/api/suppression/${id}`, { method: "DELETE" }),
};

export type Form = {
  id: number;
  name: string;
  form_type: string;
  fields?: unknown[] | null;
  success_message?: string | null;
  redirect_url?: string | null;
  add_to_group_id?: number | null;
  trigger_automation_id?: number | null;
  created_at: string;
  submission_count?: number;
};

export const formsApi = {
  list: () => api<Form[]>("/api/forms"),
  get: (id: number) => api<Form>(`/api/forms/${id}`),
  create: (body: {
    name: string;
    form_type?: string;
    fields?: unknown[];
    success_message?: string | null;
    redirect_url?: string | null;
    add_to_group_id?: number | null;
    trigger_automation_id?: number | null;
  }) =>
    api<Form>("/api/forms", { method: "POST", body: JSON.stringify(body) }),
  update: (id: number, body: Partial<Form>) =>
    api<Form>(`/api/forms/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id: number) => api<void>(`/api/forms/${id}`, { method: "DELETE" }),
};

export const automationsApi = {
  list: (skip = 0, limit = 100) =>
    api<Automation[]>(`/api/automations?skip=${skip}&limit=${limit}`),
  create: (body: {
    name: string;
    trigger_type: string;
    is_active?: boolean;
    steps: {
      order: number;
      step_type: string;
      payload?: Record<string, unknown>;
    }[];
  }) =>
    api<Automation>("/api/automations", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  get: (id: number) => api<Automation>(`/api/automations/${id}`),
  update: (
    id: number,
    body: {
      name?: string;
      is_active?: boolean;
      steps?: {
        order: number;
        step_type: string;
        payload?: Record<string, unknown>;
      }[];
    }
  ) =>
    api<Automation>(`/api/automations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  trigger: (id: number, body: { subscriber_id: number }) =>
    api<{ run_id: number; status: string }>(`/api/automations/${id}/trigger`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  resume: (id: number) =>
    api<Automation>(`/api/automations/${id}/resume`, { method: "POST" }),
  delete: (id: number) =>
    api<void>(`/api/automations/${id}`, { method: "DELETE" }),
};

export type EventType = {
  id: number;
  name: string;
  slug: string;
  duration_minutes: number;
  created_at?: string;
  description?: string | null;
  location_type?: string | null;
  location_link?: string | null;
  buffer_before_minutes?: number;
  buffer_after_minutes?: number;
  minimum_notice_minutes?: number;
  date_range_start_days?: number | null;
  date_range_end_days?: number | null;
  max_bookings_per_day?: number | null;
  max_future_bookings?: number | null;
  timezone?: string | null;
  slot_capacity?: number;
  max_bookings_per_invitee?: number | null;
  max_bookings_per_invitee_period_days?: number | null;
  confirmation_mode?: string;
  send_calendar_invite?: boolean;
  send_email_confirmation?: boolean;
  send_sms_confirmation?: boolean;
};

export type Booking = {
  id: number;
  event_type_id: number;
  team_member_id: number | null;
  title: string | null;
  start_at: string;
  end_at: string;
  attendee_name: string | null;
  attendee_email: string | null;
  status: string;
  amount: number | null;
  created_at: string | null;
};

export type TeamMember = {
  id: number;
  name: string;
  created_at?: string;
};

export const eventTypesApi = {
  list: (skip = 0, limit = 100) =>
    api<EventType[]>(`/api/event-types?skip=${skip}&limit=${limit}`),
  create: (body: Partial<EventType> & { name: string; slug: string }) =>
    api<EventType>("/api/event-types", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  get: (id: number) => api<EventType>(`/api/event-types/${id}`),
  update: (id: number, body: Partial<EventType>) =>
    api<EventType>(`/api/event-types/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (id: number) => api<void>(`/api/event-types/${id}`, { method: "DELETE" }),
  getAvailability: (id: number) =>
    api<Array<{ id: number; day_of_week: number; start_time: string; end_time: string }>>(
      `/api/event-types/${id}/availability`
    ),
  setAvailability: (id: number, slots: Array<{ day_of_week: number; start_time: string; end_time: string }>) =>
    api<{ updated: number }>(`/api/event-types/${id}/availability`, {
      method: "PUT",
      body: JSON.stringify({ slots }),
    }),
  listOverrides: (id: number) =>
    api<Array<{ id: number; event_type_id: number; override_date: string; is_available: boolean; start_time: string | null; end_time: string | null }>>(
      `/api/event-types/${id}/availability-overrides`
    ),
  createOverride: (id: number, body: { override_date: string; is_available?: boolean; start_time?: string; end_time?: string }) =>
    api<{ id: number; event_type_id: number; override_date: string; is_available: boolean; start_time: string | null; end_time: string | null }>(
      `/api/event-types/${id}/availability-overrides`,
      { method: "POST", body: JSON.stringify(body) }
    ),
  deleteOverride: (eventTypeId: number, overrideId: number) =>
    api<void>(`/api/event-types/${eventTypeId}/availability-overrides/${overrideId}`, { method: "DELETE" }),
  listMembers: (id: number) =>
    api<Array<{ id: number; event_type_id: number; team_member_id: number; sort_order: number }>>(
      `/api/event-types/${id}/members`
    ),
  addMember: (id: number, body: { team_member_id: number; sort_order?: number }) =>
    api<{ id: number; event_type_id: number; team_member_id: number; sort_order: number }>(
      `/api/event-types/${id}/members`,
      { method: "POST", body: JSON.stringify(body) }
    ),
  removeMember: (eventTypeId: number, memberId: number) =>
    api<void>(`/api/event-types/${eventTypeId}/members/${memberId}`, { method: "DELETE" }),
  getAvailableSlots: (id: number, fromDate: string, toDate: string) =>
    api<{ slots: Array<{ start: string; end: string }> }>(
      `/api/event-types/${id}/available-slots?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`
    ),
  listVacationBlocks: (id: number) =>
    api<Array<{ id: number; team_member_id?: number; event_type_id?: number; start_date: string; end_date: string; reason: string | null; created_at?: string }>>(
      `/api/event-types/${id}/vacation-blocks`
    ),
  createVacationBlock: (eventTypeId: number, body: { start_date: string; end_date: string; reason?: string }) =>
    api<{ id: number; start_date: string; end_date: string; reason: string | null }>(
      `/api/event-types/${eventTypeId}/vacation-blocks`,
      { method: "POST", body: JSON.stringify(body) }
    ),
  deleteVacationBlock: (eventTypeId: number, blockId: number) =>
    api<void>(`/api/event-types/${eventTypeId}/vacation-blocks/${blockId}`, { method: "DELETE" }),
  listBookingQuestions: (id: number) =>
    api<Array<{ id: number; event_type_id: number; sort_order: number; question_type: string; label: string; required: boolean; options: string[] | null; show_if: Record<string, unknown> | null }>>(
      `/api/event-types/${id}/booking-questions`
    ),
  createBookingQuestion: (eventTypeId: number, body: { question_type: string; label: string; required?: boolean; options?: string[]; show_if?: Record<string, unknown> }) =>
    api<{ id: number; question_type: string; label: string; required: boolean; options: string[] | null; show_if: Record<string, unknown> | null }>(
      `/api/event-types/${eventTypeId}/booking-questions`,
      { method: "POST", body: JSON.stringify(body) }
    ),
  deleteBookingQuestion: (eventTypeId: number, questionId: number) =>
    api<void>(`/api/event-types/${eventTypeId}/booking-questions/${questionId}`, { method: "DELETE" }),
};

export const bookingsApi = {
  list: (params?: { skip?: number; limit?: number; event_type_id?: number; status?: string; from?: string; to?: string }) => {
    const sp = new URLSearchParams();
    if (params?.skip != null) sp.set("skip", String(params.skip));
    if (params?.limit != null) sp.set("limit", String(params.limit));
    if (params?.event_type_id != null) sp.set("event_type_id", String(params.event_type_id));
    if (params?.status != null) sp.set("status", params.status);
    if (params?.from != null) sp.set("from", params.from);
    if (params?.to != null) sp.set("to", params.to);
    return api<Booking[]>(`/api/bookings?${sp.toString()}`);
  },
  create: (body: {
    event_type_id: number;
    team_member_id?: number;
    title?: string;
    start_at: string;
    end_at: string;
    attendee_name?: string;
    attendee_email?: string;
    status?: string;
    amount?: number;
  }) =>
    api<Booking>("/api/bookings", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  get: (id: number) => api<Booking>(`/api/bookings/${id}`),
  update: (id: number, body: Partial<Booking>) =>
    api<Booking>(`/api/bookings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (id: number) => api<void>(`/api/bookings/${id}`, { method: "DELETE" }),
};

export const teamMembersApi = {
  list: (skip = 0, limit = 100) =>
    api<TeamMember[]>(`/api/team-members?skip=${skip}&limit=${limit}`),
  create: (body: { name: string }) =>
    api<TeamMember>("/api/team-members", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  get: (id: number) => api<TeamMember>(`/api/team-members/${id}`),
  delete: (id: number) => api<void>(`/api/team-members/${id}`, { method: "DELETE" }),
  listVacationBlocks: (memberId: number) =>
    api<Array<{ id: number; start_date: string; end_date: string; reason: string | null }>>(
      `/api/team-members/${memberId}/vacation-blocks`
    ),
  createVacationBlock: (memberId: number, body: { start_date: string; end_date: string; reason?: string }) =>
    api<{ id: number; start_date: string; end_date: string; reason: string | null }>(
      `/api/team-members/${memberId}/vacation-blocks`,
      { method: "POST", body: JSON.stringify(body) }
    ),
  deleteVacationBlock: (memberId: number, blockId: number) =>
    api<void>(`/api/team-members/${memberId}/vacation-blocks/${blockId}`, { method: "DELETE" }),
};

export type CalendarConnection = {
  id: number;
  team_member_id: number;
  provider: string;
  email: string | null;
  sync_enabled: boolean;
  last_synced_at: string | null;
  created_at: string | null;
};

export const calendarApi = {
  listConnections: (teamMemberId?: number) =>
    api<CalendarConnection[]>(
      teamMemberId != null ? `/api/calendar/connections?team_member_id=${teamMemberId}` : "/api/calendar/connections"
    ),
  startConnect: (body: { team_member_id: number; provider?: string }) =>
    api<{ auth_url: string; state: string }>("/api/calendar/connections/start", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  disconnect: (connectionId: number) =>
    api<void>(`/api/calendar/connections/${connectionId}`, { method: "DELETE" }),
};

export type BookingProfile = {
  id: number;
  username: string;
  profile_photo_url: string | null;
  bio: string | null;
  timezone: string;
  timezone_auto_detect: boolean;
  social_links: Record<string, string> | null;
  custom_branding_enabled: boolean;
  hidden_event_type_ids: number[] | null;
  custom_url_slug: string | null;
  custom_domain: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_image_url: string | null;
  language: string;
  created_at: string | null;
  updated_at: string | null;
};

export const bookingProfileApi = {
  get: () => api<BookingProfile>("/api/booking-profile"),
  update: (body: Partial<BookingProfile>) =>
    api<BookingProfile>("/api/booking-profile", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

export async function healthCheck(): Promise<{ status: string }> {
  return api<{ status: string }>("/health");
}

// --- Public booking (invitee flow) ---

export type PublicEventType = {
  id: number;
  name: string;
  slug: string;
  duration_minutes: number;
  description: string;
  location_type: string | null;
  location_link: string | null;
  location_display: string;
  confirmation_mode: string;
  send_calendar_invite: boolean;
  send_email_confirmation: boolean;
  questions: Array<{
    id: number;
    sort_order: number;
    question_type: string;
    label: string;
    required: boolean;
    options: string[] | null;
    show_if: { question_id?: number; value?: unknown } | null;
  }>;
};

export const publicBookingApi = {
  getEventTypeBySlug: (slug: string) =>
    api<PublicEventType>(`/api/public/event-types/by-slug/${encodeURIComponent(slug)}`),
  getAvailableSlots: (eventTypeId: number, fromDate: string, toDate: string) =>
    api<{ slots: Array<{ start: string; end: string }> }>(
      `/api/event-types/${eventTypeId}/available-slots?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`
    ),
  createBooking: (body: {
    event_type_id: number;
    start_at: string;
    end_at: string;
    attendee_name: string;
    attendee_email: string;
    attendee_phone?: string;
    form_responses?: Record<string, unknown>;
    gdpr_consent: boolean;
  }) =>
    api<{
      id: number;
      event_type_id: number;
      title: string;
      start_at: string;
      end_at: string;
      status: string;
      confirmation_mode: string;
      ics: string;
    }>("/api/public/bookings", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
