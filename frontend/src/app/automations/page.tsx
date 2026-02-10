"use client";

import { useEffect, useState } from "react";
import {
  automationsApi,
  subscribersApi,
  type Automation,
  type Subscriber,
} from "@/lib/api";

export default function AutomationsPage() {
  const [list, setList] = useState<Automation[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("subscriber_added");
  const [steps, setSteps] = useState<
    { order: number; step_type: string; payload?: Record<string, unknown> }[]
  >([]);
  const [triggerSubId, setTriggerSubId] = useState("");
  const [triggerAutoId, setTriggerAutoId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([automationsApi.list(0, 100), subscribersApi.list(0, 200)])
      .then(([a, s]) => {
        setList(a);
        setSubscribers(s);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const addStep = (type: "email" | "delay") => {
    setSteps((prev) => [
      ...prev,
      type === "email"
        ? {
            order: prev.length,
            step_type: "email",
            payload: { subject: "", html: "" },
          }
        : {
            order: prev.length,
            step_type: "delay",
            payload: { delay_minutes: 60 },
          },
    ]);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    automationsApi
      .create({
        name,
        trigger_type: triggerType,
        is_active: true,
        steps: steps.map((s, i) => ({ ...s, order: i })),
      })
      .then(() => {
        setName("");
        setTriggerType("subscriber_added");
        setSteps([]);
        setShowForm(false);
        load();
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to create")
      );
  };

  const handleTrigger = (automationId: number) => {
    const subId = parseInt(triggerSubId, 10);
    if (!subId) {
      setError("Enter a subscriber ID");
      return;
    }
    setTriggerAutoId(automationId);
    automationsApi
      .trigger(automationId, { subscriber_id: subId })
      .then(() => {
        setTriggerSubId("");
        setTriggerAutoId(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Trigger failed");
        setTriggerAutoId(null);
      });
  };

  const updateStepPayload = (
    index: number,
    key: string,
    value: string | number
  ) => {
    setSteps((prev) => {
      const next = [...prev];
      const payload = { ...(next[index].payload || {}), [key]: value };
      next[index] = { ...next[index], payload };
      return next;
    });
  };

  if (loading && list.length === 0)
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-400" />
      </div>
    );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Automations
          </h1>
          <p className="mt-1 text-zinc-400">
            Trigger-based email flows (e.g. welcome series)
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl bg-indigo-500 px-5 py-2.5 font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-600 active:scale-[0.98]"
        >
          {showForm ? "Cancel" : "Create automation"}
        </button>
      </div>

      {error && (
        <div className="glass rounded-2xl border-red-500/20 bg-red-500/10 px-6 py-4 text-red-300">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="glass space-y-5 rounded-2xl border border-white/10 p-6"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-glass w-full max-w-md"
              placeholder="e.g. Welcome new subscriber"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">
              Trigger
            </label>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
              className="input-glass w-full max-w-md"
            >
              <option value="subscriber_added">When subscriber is added</option>
            </select>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-400">Steps</span>
              <button
                type="button"
                onClick={() => addStep("email")}
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-300 transition-all hover:bg-white/10"
              >
                + Email
              </button>
              <button
                type="button"
                onClick={() => addStep("delay")}
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-300 transition-all hover:bg-white/10"
              >
                + Delay
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {steps.map((s, i) => (
                <div
                  key={i}
                  className="glass rounded-xl border border-white/10 p-4"
                >
                  <span className="text-sm font-semibold capitalize text-zinc-300">
                    {s.step_type}
                  </span>
                  {s.step_type === "email" && (
                    <div className="mt-3 space-y-2">
                      <input
                        type="text"
                        placeholder="Subject"
                        value={(s.payload?.subject as string) ?? ""}
                        onChange={(e) =>
                          updateStepPayload(i, "subject", e.target.value)
                        }
                        className="input-glass w-full text-sm"
                      />
                      <textarea
                        placeholder="HTML body"
                        rows={3}
                        value={(s.payload?.html as string) ?? ""}
                        onChange={(e) =>
                          updateStepPayload(i, "html", e.target.value)
                        }
                        className="input-glass w-full text-sm"
                      />
                    </div>
                  )}
                  {s.step_type === "delay" && (
                    <div className="mt-3">
                      <input
                        type="number"
                        placeholder="Delay (minutes)"
                        value={(s.payload?.delay_minutes as number) ?? 60}
                        onChange={(e) =>
                          updateStepPayload(
                            i,
                            "delay_minutes",
                            parseInt(e.target.value, 10) || 0
                          )
                        }
                        className="input-glass w-32 text-sm"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="rounded-xl bg-indigo-500 px-5 py-2.5 font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-600"
          >
            Create automation
          </button>
        </form>
      )}

      <div className="space-y-4">
        {list.map((a) => (
          <div
            key={a.id}
            className="glass flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 p-5 transition-all hover:border-white/15"
          >
            <div>
              <p className="font-semibold text-zinc-100">{a.name}</p>
              <p className="mt-0.5 text-sm text-zinc-500">
                Trigger: {a.trigger_type}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {a.steps.length} step(s)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Subscriber ID"
                value={triggerAutoId === a.id ? triggerSubId : ""}
                onChange={(e) => setTriggerSubId(e.target.value)}
                className="input-glass w-28 text-sm"
              />
              <button
                onClick={() => handleTrigger(a.id)}
                disabled={triggerAutoId === a.id}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-500 disabled:opacity-50"
              >
                Test trigger
              </button>
            </div>
          </div>
        ))}
      </div>

      {list.length === 0 && !loading && (
        <div className="glass rounded-2xl border border-white/10 px-6 py-12 text-center text-zinc-500">
          No automations yet. Create one (e.g. welcome email).
        </div>
      )}
    </div>
  );
}
