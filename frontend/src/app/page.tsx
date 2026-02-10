"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  subscribersApi,
  campaignsApi,
  type Subscriber,
  type Campaign,
} from "@/lib/api";

export default function DashboardPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([subscribersApi.list(0, 1000), campaignsApi.list(0, 10)])
      .then(([subs, camps]) => {
        setSubscribers(subs);
        setCampaigns(camps);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-400" />
      </div>
    );
  if (error)
    return (
      <div className="glass rounded-2xl border-red-500/20 bg-red-500/10 px-6 py-4 text-red-300">
        {error}
      </div>
    );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Dashboard
        </h1>
        <p className="mt-1 text-zinc-400">Overview of your email automation</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Link
          href="/subscribers"
          className="glass group rounded-2xl border border-white/10 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-xl hover:shadow-indigo-500/5"
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-200">
                Subscribers
              </h2>
              <p className="mt-2 text-4xl font-bold text-white">
                {subscribers.length}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-400 transition-colors group-hover:text-indigo-300">
                Manage subscribers
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </span>
            </div>
            <div className="rounded-xl bg-indigo-500/20 p-3">
              <svg
                className="h-8 w-8 text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
        </Link>

        <Link
          href="/campaigns"
          className="glass group rounded-2xl border border-white/10 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-xl hover:shadow-indigo-500/5"
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-200">
                Recent campaigns
              </h2>
              <p className="mt-2 text-4xl font-bold text-white">
                {campaigns.length}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-400 transition-colors group-hover:text-indigo-300">
                View campaigns
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </span>
            </div>
            <div className="rounded-xl bg-violet-500/20 p-3">
              <svg
                className="h-8 w-8 text-violet-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
        </Link>
      </div>

      {campaigns.length > 0 && (
        <div className="glass rounded-2xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white">Latest campaigns</h2>
          <ul className="mt-4 space-y-2">
            {campaigns.slice(0, 5).map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10"
              >
                <span className="font-medium text-zinc-100">{c.name}</span>
                <span
                  className={`badge badge-${
                    c.status === "sent" ? "sent" : "draft"
                  }`}
                >
                  {c.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
