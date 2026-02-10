"use client";

import { useEffect, useState } from "react";
import { campaignsApi, type Campaign } from "@/lib/api";

export default function CampaignsPage() {
  const [list, setList] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [sendingId, setSendingId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    campaignsApi
      .list(0, 100)
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    campaignsApi
      .create({ name, subject, html_body: htmlBody })
      .then(() => {
        setName("");
        setSubject("");
        setHtmlBody("");
        setShowForm(false);
        load();
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to create")
      );
  };

  const handleSend = (id: number) => {
    if (!confirm("Send this campaign to all active subscribers?")) return;
    setSendingId(id);
    campaignsApi
      .send(id, {})
      .then(() => load())
      .catch((e) => setError(e instanceof Error ? e.message : "Send failed"))
      .finally(() => setSendingId(null));
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
            Campaigns
          </h1>
          <p className="mt-1 text-zinc-400">Create and send email campaigns</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl bg-indigo-500 px-5 py-2.5 font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-600 active:scale-[0.98]"
        >
          {showForm ? "Cancel" : "Create campaign"}
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
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input-glass w-full max-w-md"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">
              HTML body
            </label>
            <textarea
              value={htmlBody}
              onChange={(e) => setHtmlBody(e.target.value)}
              rows={10}
              className="input-glass w-full font-mono text-sm"
              required
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-indigo-500 px-5 py-2.5 font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-600"
          >
            Create campaign
          </button>
        </form>
      )}

      <div className="space-y-4">
        {list.map((c) => (
          <div
            key={c.id}
            className="glass flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 p-5 transition-all hover:border-white/15"
          >
            <div>
              <p className="font-semibold text-zinc-100">{c.name}</p>
              <p className="mt-0.5 text-sm text-zinc-500">{c.subject}</p>
              <span
                className={`mt-2 badge badge-${
                  c.status === "sent" ? "sent" : "draft"
                }`}
              >
                {c.status}
              </span>
            </div>
            {c.status === "draft" && (
              <button
                onClick={() => handleSend(c.id)}
                disabled={sendingId === c.id}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 font-medium text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-500 disabled:opacity-50"
              >
                {sendingId === c.id ? "Sending…" : "Send to all"}
              </button>
            )}
          </div>
        ))}
      </div>

      {list.length === 0 && !loading && (
        <div className="glass rounded-2xl border border-white/10 px-6 py-12 text-center text-zinc-500">
          No campaigns yet. Create one to get started.
        </div>
      )}
    </div>
  );
}
