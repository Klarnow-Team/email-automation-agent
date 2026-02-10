const API_BASE =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || ""
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  created_at: string;
};

export type Campaign = {
  id: number;
  name: string;
  subject: string;
  html_body: string;
  status: string;
  sent_at: string | null;
  created_at: string;
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
  create: (body: { email: string; name?: string }) =>
    api<Subscriber>("/api/subscribers", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  get: (id: number) => api<Subscriber>(`/api/subscribers/${id}`),
  update: (id: number, body: { name?: string; status?: string }) =>
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
  create: (body: { name: string; subject: string; html_body: string }) =>
    api<Campaign>("/api/campaigns", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  get: (id: number) => api<Campaign>(`/api/campaigns/${id}`),
  send: (id: number, body: { recipient_ids?: number[] }) =>
    api<{ sent: number; message: string }>(`/api/campaigns/${id}/send`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
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
};

export async function healthCheck(): Promise<{ status: string }> {
  return api<{ status: string }>("/health");
}
