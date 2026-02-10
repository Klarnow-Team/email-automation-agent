"use client";

import { useEffect, useState } from "react";
import { subscribersApi, type Subscriber } from "@/lib/api";

export default function SubscribersPage() {
  const [list, setList] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);

  const load = () => {
    setLoading(true);
    subscribersApi
      .list(0, 500)
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    subscribersApi
      .create({ email: email.trim(), name: name.trim() || undefined })
      .then(() => {
        setEmail("");
        setName("");
        load();
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to add"));
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = importText
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const items = lines
      .map((line) => {
        const parts = line.split(/[,\t]/).map((s) => s.trim());
        return { email: parts[0] || "", name: parts[1] || undefined };
      })
      .filter((x) => x.email);
    if (items.length === 0) return;
    subscribersApi
      .import(items)
      .then(() => {
        setImportText("");
        setShowImport(false);
        load();
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Import failed"));
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this subscriber?")) return;
    subscribersApi
      .delete(id)
      .then(load)
      .catch((e) => setError(e instanceof Error ? e.message : "Delete failed"));
  };

  if (loading && list.length === 0)
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-400" />
      </div>
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Subscribers
        </h1>
        <p className="mt-1 text-zinc-400">
          Add, import, and manage your email list
        </p>
      </div>

      {error && (
        <div className="glass rounded-2xl border-red-500/20 bg-red-500/10 px-6 py-4 text-red-300">
          {error}
        </div>
      )}

      <form
        onSubmit={handleAdd}
        className="glass flex flex-wrap items-end gap-4 rounded-2xl border border-white/10 p-6"
      >
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-400">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-glass w-64"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-400">
            Name (optional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-glass w-48"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-indigo-500 px-5 py-2.5 font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-600 active:scale-[0.98]"
        >
          Add subscriber
        </button>
        <button
          type="button"
          onClick={() => setShowImport(!showImport)}
          className="rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 font-medium text-zinc-200 transition-all hover:bg-white/10"
        >
          {showImport ? "Cancel import" : "Import"}
        </button>
      </form>

      {showImport && (
        <form
          onSubmit={handleImport}
          className="glass rounded-2xl border border-white/10 p-6"
        >
          <label className="mb-2 block text-sm font-medium text-zinc-400">
            Paste emails (one per line, or email,name per line)
          </label>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={6}
            className="input-glass w-full resize-y font-mono text-sm"
          />
          <button
            type="submit"
            className="mt-4 rounded-xl bg-indigo-500 px-5 py-2.5 font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-600"
          >
            Import
          </button>
        </form>
      )}

      <div className="glass overflow-hidden rounded-2xl border border-white/10">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300">
                Email
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300">
                Name
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300">
                Status
              </th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-zinc-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.map((s) => (
              <tr key={s.id} className="transition-colors hover:bg-white/5">
                <td className="px-6 py-4 font-medium text-zinc-100">
                  {s.email}
                </td>
                <td className="px-6 py-4 text-zinc-400">{s.name ?? "—"}</td>
                <td className="px-6 py-4">
                  <span className="badge badge-active">{s.status}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {list.length === 0 && !loading && (
        <div className="glass rounded-2xl border border-white/10 px-6 py-12 text-center text-zinc-500">
          No subscribers yet. Add or import some.
        </div>
      )}
    </div>
  );
}
