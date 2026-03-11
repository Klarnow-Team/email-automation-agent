"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { subscribersApi, groupsApi, type Subscriber, type SubscriberStats } from "@/lib/api";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Badge, Button, Input, Modal } from "@/components/ui";
import { SegmentsContent } from "@/app/segments/page";
import { GroupsContent } from "@/app/groups/page";
import { FieldsContent } from "@/app/fields/page";
import { useChartTheme } from "@/hooks/useChartTheme";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

const PAGE_SIZE = 15;
const SEVEN_DAYS_AGO = Date.now() - 7 * 24 * 60 * 60 * 1000;

function formatRelative(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function PlaceholderView({ title }: { title: string }) {
  return (
    <div className="py-12 text-center text-muted">
      <p className="font-medium text-foreground">{title}</p>
      <p className="text-sm mt-1">Coming soon.</p>
    </div>
  );
}

const STATS_PERIODS: { value: string; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "2m", label: "Last 2 months" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "year", label: "This year" },
  { value: "last_year", label: "Last year" },
];

function StatsContent() {
  const theme = useChartTheme();
  const [period, setPeriod] = useState("30d");
  const [data, setData] = useState<SubscriberStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    subscribersApi
      .getStats(period)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load stats"))
      .finally(() => setLoading(false));
  }, [period]);

  const chartOption = useMemo(() => {
    if (!data?.chart) return null;
    const { dates, subscribes, unsubscribes } = data.chart;
    const labelShort = (d: string) => {
      try {
        return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      } catch {
        return d;
      }
    };
    return {
      textStyle: { fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', color: theme.foreground },
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow", shadowStyle: { color: "rgba(0,0,0,0.06)" } },
        backgroundColor: theme.surfaceElevated,
        borderColor: theme.cardBorder,
        borderWidth: 1,
        borderRadius: 8,
        textStyle: { color: theme.foreground, fontSize: 12 },
        padding: [12, 16],
        formatter: (params: unknown) => {
          const p = Array.isArray(params) ? params : [];
          if (p.length === 0) return "";
          const first = p[0] as { axisValue?: string; seriesName?: string; value?: number };
          const d = labelShort(first.axisValue ?? "");
          const sub = (p as { seriesName?: string; value?: number }[]).find((x) => x.seriesName === "Subscribes")?.value ?? 0;
          const unsub = (p as { seriesName?: string; value?: number }[]).find((x) => x.seriesName === "Unsubscribes")?.value ?? 0;
          return `<div style="font-weight:600;margin-bottom:6px">${d}</div>Subscribes: ${sub}<br/>Unsubscribes: ${unsub}`;
        },
      },
      grid: { left: "2%", right: "2%", bottom: "14%", top: "14%", containLabel: true },
      xAxis: {
        type: "category",
        boundaryGap: true,
        data: dates.map(labelShort),
        axisLine: { show: true, lineStyle: { color: theme.cardBorder, width: 1 } },
        axisTick: { show: false },
        axisLabel: { color: theme.mutedDim, fontSize: 11, margin: 10 },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: theme.mutedDim, fontSize: 11 },
        splitLine: { lineStyle: { color: theme.cardBorder, type: "dashed", opacity: 0.4 } },
      },
      series: [
        {
          name: "Subscribes",
          type: "bar",
          barWidth: "28%",
          barGap: "40%",
          barCategoryGap: "24%",
          data: subscribes,
          itemStyle: {
            color: theme.accent,
            borderRadius: [6, 6, 0, 0],
          },
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.15)" } },
        },
        {
          name: "Unsubscribes",
          type: "bar",
          barWidth: "28%",
          barGap: "40%",
          barCategoryGap: "24%",
          data: unsubscribes,
          itemStyle: {
            color: theme.danger,
            borderRadius: [6, 6, 0, 0],
          },
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.15)" } },
        },
      ],
      legend: {
        bottom: 0,
        textStyle: { color: theme.muted, fontSize: 12 },
        itemGap: 24,
        itemWidth: 14,
        itemHeight: 10,
      },
    };
  }, [data?.chart, theme]);

  const engagementPieOption = useMemo(() => {
    if (!data?.subscriber_engagement) return null;
    const { read_never, read_sometimes, read_often } = data.subscriber_engagement;
    const pieData = [
      { value: read_never, name: "Read never", itemStyle: { color: theme.muted } },
      { value: read_sometimes, name: "Read sometimes", itemStyle: { color: theme.success } },
      { value: read_often, name: "Read often", itemStyle: { color: theme.accent } },
    ].filter((d) => d.value > 0);
    if (pieData.length === 0) pieData.push({ value: 1, name: "No data", itemStyle: { color: theme.muted } });
    return {
      textStyle: { fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', color: theme.foreground },
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        formatter: "{b}: {c} ({d}%)",
        backgroundColor: theme.surfaceElevated,
        borderColor: theme.cardBorder,
        borderWidth: 1,
        borderRadius: 8,
        textStyle: { color: theme.foreground, fontSize: 12 },
        padding: [12, 16],
      },
      legend: {
        orient: "vertical",
        right: 8,
        top: "center",
        textStyle: { color: theme.muted, fontSize: 12 },
        itemGap: 10,
        itemWidth: 12,
        itemHeight: 10,
      },
      series: [
        {
          type: "pie",
          radius: ["44%", "72%"],
          center: ["40%", "50%"],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 8, borderColor: theme.surface, borderWidth: 2 },
          label: { show: true, formatter: "{b}\n{d}%", color: theme.foreground, fontSize: 11 },
          emphasis: { label: { show: true }, itemStyle: { shadowBlur: 12, shadowColor: "rgba(0,0,0,0.2)" } },
          data: pieData,
        },
      ],
    };
  }, [data?.subscriber_engagement, theme]);

  if (loading && !data)
    return (
      <div className="subscribers-view-content">
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="spinner" />
          <span className="ml-3 text-sm text-muted-dim">Loading stats…</span>
        </div>
      </div>
    );

  if (error && !data)
    return (
      <div className="subscribers-view-content">
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      </div>
    );

  const s = data!;
  return (
    <div className="subscribers-view-content">
      <div className="subscribers-view-toolbar flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="stats-period" className="text-sm text-muted-dim">Time range:</label>
          <select
            id="stats-period"
            className="rounded-md border border-[var(--card-border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-sm text-[var(--foreground)]"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {STATS_PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="stats-kpi-grid grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 mt-4">
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-elevated)] p-4">
          <p className="text-xs uppercase tracking-wider text-muted-dim">Total active subscribers</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--foreground)]">
            <AnimatedCounter value={s.total_active} />
          </p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-elevated)] p-4">
          <p className="text-xs uppercase tracking-wider text-muted-dim">New subscribers today</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--foreground)]">
            <AnimatedCounter value={s.new_today} />
          </p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-elevated)] p-4">
          <p className="text-xs uppercase tracking-wider text-muted-dim">New in selected period</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--foreground)]">
            <AnimatedCounter value={s.new_in_period} />
          </p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-elevated)] p-4">
          <p className="text-xs uppercase tracking-wider text-muted-dim">New this month</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--foreground)]">
            <AnimatedCounter value={s.new_this_month} />
          </p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-elevated)] p-4">
          <p className="text-xs uppercase tracking-wider text-muted-dim">Unsubscribed in period</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--foreground)]">
            <AnimatedCounter value={s.unsubscribed_in_period} />
          </p>
        </div>
      </div>
      <div className="stats-kpi-grid grid grid-cols-2 gap-4 sm:grid-cols-4 mt-4">
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-elevated)] p-4">
          <p className="text-xs uppercase tracking-wider text-muted-dim">Avg open rate</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--foreground)]">{s.avg_open_rate}%</p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-elevated)] p-4">
          <p className="text-xs uppercase tracking-wider text-muted-dim">Avg click rate</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--foreground)]">{s.avg_click_rate}%</p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-elevated)] p-4">
          <p className="text-xs uppercase tracking-wider text-muted-dim">Avg new subscribers/day</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--foreground)]">{s.avg_new_subscribers}</p>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-elevated)] p-4">
          <p className="text-xs uppercase tracking-wider text-muted-dim">Avg unsubscribes/day</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--foreground)]">{s.avg_unsubscribes}</p>
        </div>
      </div>
      <div className="mt-6 rounded-xl border border-[var(--card-border)] bg-[var(--surface-elevated)] p-4">
        <h3 className="text-sm font-medium text-muted-dim mb-3">Subscribes vs Unsubscribes</h3>
        {chartOption && (
          <ReactECharts option={chartOption} style={{ height: 320 }} notMerge />
        )}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-elevated)] p-4">
          <h3 className="text-sm font-medium text-muted-dim mb-3">Top domains</h3>
          {s.top_domains.length === 0 ? (
            <p className="text-sm text-muted-dim">No data</p>
          ) : (
            <ul className="space-y-2">
              {s.top_domains.map(({ domain, count }) => {
                const pct = s.total_active > 0 ? Math.round((count / s.total_active) * 1000) / 10 : 0;
                return (
                  <li key={domain} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{domain}</span>
                    <span className="tabular-nums text-muted-dim">{pct}%</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-elevated)] p-4">
          <h3 className="text-sm font-medium text-muted-dim mb-3">Top email clients</h3>
          {s.top_email_clients.length === 0 ? (
            <p className="text-sm text-muted-dim">No data (opens/clicks will show here)</p>
          ) : (
            <ul className="space-y-2">
              {s.top_email_clients.map(({ client, count }) => (
                <li key={client} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{client}</span>
                  <span className="tabular-nums text-muted-dim">{count.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-elevated)] p-4">
          <h3 className="text-sm font-medium text-muted-dim mb-3">Subscriber engagement (this period)</h3>
          {engagementPieOption && (
            <ReactECharts option={engagementPieOption} style={{ height: 260 }} notMerge />
          )}
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-elevated)] p-4">
          <h3 className="text-sm font-medium text-muted-dim mb-3">Reading environment</h3>
          {s.reading_environment.every((r) => r.count === 0) ? (
            <p className="text-sm text-muted-dim">No data (opens/clicks will show here)</p>
          ) : (
            <ul className="space-y-2">
              {s.reading_environment.map(({ environment, count }) => (
                <li key={environment} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground capitalize">{environment}</span>
                  <span className="tabular-nums text-muted-dim">{count.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function SubscribersPageInner() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "all";

  const [list, setList] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [addingSubscriber, setAddingSubscriber] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; email: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showAddToGroup, setShowAddToGroup] = useState(false);
  const [groups, setGroups] = useState<{ id: number; name: string }[]>([]);
  const [addingToGroupId, setAddingToGroupId] = useState<number | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

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
    if (!email.trim() || addingSubscriber) return;
    setAddingSubscriber(true);
    setError(null);
    subscribersApi
      .create({ email: email.trim(), name: name.trim() || undefined, phone: phone.trim() || undefined })
      .then(() => {
        setEmail("");
        setName("");
        setPhone("");
        load();
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to add"))
      .finally(() => setAddingSubscriber(false));
  };

  const getImportCount = () => {
    const lines = importText
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    return lines.filter((line) => {
      const parts = parseCsvLine(line);
      return parts[0] && parts[0].length > 0;
    }).length;
  };

  function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    const sep = line.includes("\t") ? "\t" : ",";
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        i += 1;
        let cell = "";
        while (i < line.length) {
          if (line[i] === '"') {
            i += 1;
            if (line[i] === '"') {
              cell += '"';
              i += 1;
            } else break;
          } else {
            cell += line[i];
            i += 1;
          }
        }
        result.push(cell.trim());
      } else {
        const end = line.indexOf(sep, i);
        const slice = end === -1 ? line.slice(i) : line.slice(i, end);
        result.push(slice.trim().replace(/^"|"$/g, ""));
        i = end === -1 ? line.length : end + 1;
      }
    }
    return result;
  }

  const parseImportTextToItems = (
    text: string,
  ): { email: string; name?: string; phone?: string }[] => {
    return text
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = parseCsvLine(line);
        return {
          email: parts[0] || "",
          name: parts[1] || undefined,
          phone: parts[2]?.trim() || undefined,
        };
      })
      .filter((x) => x.email);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImportText(String(reader.result ?? ""));
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    const items = parseImportTextToItems(importText);
    if (items.length === 0 || importing) return;
    setImporting(true);
    setError(null);
    subscribersApi
      .import(items)
      .then(() => {
        setImportText("");
        setShowImport(false);
        load();
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Import failed"))
      .finally(() => setImporting(false));
  };

  const closeImportModal = () => setShowImport(false);

  useEffect(() => {
    if (!showImport) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeImportModal();
    };
    document.addEventListener("keydown", onEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "";
    };
  }, [showImport]);

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    const { id } = deleteConfirm;
    setDeletingId(id);
    setError(null);
    subscribersApi
      .delete(id)
      .then(() => {
        setDeleteConfirm(null);
        load();
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Delete failed"))
      .finally(() => setDeletingId(null));
  };

  useEffect(() => {
    if (!deleteConfirm) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDeleteConfirm(null);
    };
    document.addEventListener("keydown", onEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "";
    };
  }, [deleteConfirm]);

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email).then(() => {
      setCopiedId(email);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const exportCsv = (subs: Subscriber[]) => {
    const headers = ["email", "name", "phone", "status", "created_at"];
    const rows = subs.map((s) =>
      [
        s.email,
        s.name ?? "",
        s.phone ?? "",
        s.status,
        s.created_at,
      ].map((v) => (v.includes(",") || v.includes('"') ? `"${String(v).replace(/"/g, '""')}"` : v)).join(","),
    );
    const csv = [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(paginatedList.map((s) => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  };
  const toggleOne = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const bulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setError(null);
    setBulkDeleting(true);
    Promise.all(ids.map((id) => subscribersApi.delete(id)))
      .then(() => {
        setSelectedIds(new Set());
        setDeleteConfirm(null);
        load();
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Delete failed"))
      .finally(() => setBulkDeleting(false));
  };

  useEffect(() => {
    if (showAddToGroup) {
      groupsApi.list().then((list) => setGroups(list.map((g) => ({ id: g.id, name: g.name }))));
    }
  }, [showAddToGroup]);

  const handleAddToGroup = (groupId: number) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setAddingToGroupId(groupId);
    groupsApi
      .addSubscribers(groupId, { subscriber_ids: ids })
      .then(() => {
        setShowAddToGroup(false);
        setSelectedIds(new Set());
        load();
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to add to group"))
      .finally(() => setAddingToGroupId(null));
  };

  const filteredList = useMemo(() => {
    let out = list;
    if (statusFilter) {
      out = out.filter((s) => s.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      out = out.filter(
        (s) =>
          s.email.toLowerCase().includes(q) ||
          (s.name ?? "").toLowerCase().includes(q) ||
          (s.phone ?? "").toLowerCase().includes(q),
      );
    }
    return out;
  }, [list, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const paginatedList = useMemo(
    () => filteredList.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [filteredList, page],
  );

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  const newThisWeek = list.filter(
    (s) => new Date(s.created_at).getTime() >= SEVEN_DAYS_AGO,
  ).length;
  const withName = list.filter((s) => s.name && s.name.trim()).length;

  if (view === "segments") return <SegmentsContent />;
  if (view === "groups") return <GroupsContent />;
  if (view === "fields") return <FieldsContent />;
  if (view === "stats") return <StatsContent />;
  if (view === "clean-up-inactive") return <PlaceholderView title="Clean up inactive" />;
  if (view === "history") return <PlaceholderView title="History" />;

  if (loading && list.length === 0)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="spinner" />
        <span className="ml-3 text-sm text-muted-dim">
          Loading subscribers…
        </span>
      </div>
    );

  return (
    <div className="subscribers-page">
      {error && (
        <div className="alert-error animate-in">
          <span>{error}</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setError(null); load(); }}>Retry</Button>
            <button type="button" onClick={() => setError(null)} className="alert-dismiss" aria-label="Dismiss">Dismiss</button>
          </div>
        </div>
      )}

      {/* Stats row — highlighted cards */}
      <section className="subscribers-stats-row">
        <div className="subscribers-stat-card">
          <span>Total</span>
          <span className="subscribers-stat-value"><AnimatedCounter value={list.length} /></span>
        </div>
        <div className="subscribers-stat-card">
          <span>New this week</span>
          <span className="subscribers-stat-value text-success"><AnimatedCounter value={newThisWeek} /></span>
        </div>
        <div className="subscribers-stat-card">
          <span>With name</span>
          <span className="subscribers-stat-value"><AnimatedCounter value={withName} /></span>
        </div>
        {(searchQuery.trim() || statusFilter) && (
          <div className="subscribers-stat-card">
            <span>Showing</span>
            <span className="subscribers-stat-value">{filteredList.length}</span>
          </div>
        )}
      </section>

      {/* Add subscriber inline card (collapsed by default into toolbar above; keep card for spacing) */}
      <div className="section-card subscribers-add-card px-4 py-3">
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
          <div className="w-48">
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required disabled={addingSubscriber} />
          </div>
          <div className="w-36">
            <Input label="Name (optional)" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" disabled={addingSubscriber} />
          </div>
          <div className="w-36">
            <Input label="Phone (optional)" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1234567890" disabled={addingSubscriber} />
          </div>
          <Button type="submit" disabled={addingSubscriber}>{addingSubscriber ? "Adding…" : "Add"}</Button>
        </form>
      </div>

      {/* Filters — search + status + Import/Export */}
      <div className="subscribers-filters">
        <div className="relative flex-1 min-w-0 max-w-md">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-muted-dim">
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
            placeholder="Search by email, name or phone"
            className="input-glass w-full pl-10 py-2 rounded-lg border border-(--card-border) bg-(--surface-elevated)"
            aria-label="Search subscribers"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="rounded-lg border border-(--card-border) bg-(--surface-elevated) px-3 py-2 text-sm text-foreground"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="ghost" size="sm" type="button" onClick={() => setShowImport(true)} className="inline-flex items-center gap-1.5">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Import
          </Button>
          <Button variant="ghost" size="sm" type="button" onClick={() => exportCsv(filteredList)} disabled={filteredList.length === 0} className="inline-flex items-center gap-1.5">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export
          </Button>
        </div>
      </div>

      {/* List as table */}
      <section className="section-card subscribers-list-card">
        {filteredList.length === 0 ? (
          <div className="empty-state-centered">
            <div className="empty-state-icon" aria-hidden>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            {list.length === 0 ? (
              <>
                <p className="font-semibold text-foreground">No subscribers yet</p>
                <p className="text-sm text-muted-dim mt-1">Add one above or use Import to get started.</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-foreground">No matches</p>
                <p className="text-sm text-muted-dim mt-1">Try a different search or status filter.</p>
                <Button variant="ghost" size="sm" type="button" onClick={() => { setSearchQuery(""); setStatusFilter(""); }} className="mt-3">Clear filters</Button>
              </>
            )}
          </div>
        ) : (
          <>
            {selectedIds.size > 0 && (
              <div className="subscribers-bulk-bar">
                <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
                <Button variant="ghost" size="sm" onClick={() => setShowAddToGroup(true)}>Add to group</Button>
                <Button variant="ghost" size="sm" onClick={() => exportCsv(list.filter((s) => selectedIds.has(s.id)))}>Export selected</Button>
                <Button variant="danger" size="sm" onClick={() => setDeleteConfirm({ id: -1, email: `${selectedIds.size} subscriber${selectedIds.size !== 1 ? "s" : ""}` })}>Delete</Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Clear selection</Button>
              </div>
            )}

            <div className="subscribers-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={paginatedList.length > 0 && paginatedList.every((s) => selectedIds.has(s.id))}
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        aria-label="Select all on page"
                        className="rounded border-(--card-border)"
                      />
                    </th>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Date added</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map((s) => {
                    const isNew = new Date(s.created_at).getTime() >= SEVEN_DAYS_AGO;
                    return (
                      <tr key={s.id}>
                        <td className="w-10 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(s.id)}
                            onChange={(e) => toggleOne(s.id, e.target.checked)}
                            aria-label={`Select ${s.email}`}
                            className="rounded border-(--card-border)"
                          />
                        </td>
                        <td className="cell-email">
                          <span className="truncate max-w-[200px] inline-block" title={s.email}>{s.email}</span>
                          <button type="button" onClick={() => copyEmail(s.email)} className="ml-1.5 p-1 rounded text-muted-dim hover:text-foreground hover:bg-(--surface-hover)" title="Copy" aria-label="Copy email">{copiedId === s.email ? <span className="text-success text-xs">Copied</span> : <svg className="h-3.5 w-3.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}</button>
                        </td>
                        <td>{s.name ?? "—"}</td>
                        <td>{s.phone ?? "—"}</td>
                        <td>
                          <Badge variant={s.status === "active" ? "active" : "draft"}>{s.status}</Badge>
                          {isNew && <span className="ml-1.5 rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-success">New</span>}
                        </td>
                        <td className="tabular-nums text-muted-dim">{formatRelative(s.created_at)}</td>
                        <td className="cell-actions">
                          <Button variant="danger" size="sm" type="button" onClick={() => setDeleteConfirm({ id: s.id, email: s.email })}>Delete</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="subscribers-pagination-wrap">
              <span className="text-sm text-muted">
                Page {page + 1} of {totalPages} · {filteredList.length} subscriber{filteredList.length !== 1 ? "s" : ""}
              </span>
              <nav className="flex items-center gap-2" aria-label="Pagination">
                <button type="button" className="dash-pagination-btn" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</button>
                <button type="button" className="dash-pagination-btn" disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>Next</button>
              </nav>
            </div>
          </>
        )}
      </section>

      {/* Modals */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title={deleteConfirm?.id === -1 ? "Delete subscribers" : "Delete subscriber"} footer={<> <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button> <Button variant="danger" onClick={deleteConfirm?.id === -1 ? bulkDelete : handleDeleteConfirm} disabled={deleteConfirm?.id === -1 ? bulkDeleting : deletingId !== null}>{deleteConfirm?.id === -1 ? (bulkDeleting ? "Deleting…" : "Delete") : (deletingId !== null ? "Deleting…" : "Delete")}</Button> </>}>
        {deleteConfirm && <p className="text-muted">Remove <strong className="text-foreground">{deleteConfirm.email}</strong> from your list? This cannot be undone.</p>}
      </Modal>

      <Modal open={showImport} onClose={closeImportModal} title="Bulk import" footer={<> <Button variant="ghost" type="button" onClick={closeImportModal} disabled={importing}>Cancel</Button> <Button type="submit" form="import-form" disabled={getImportCount() === 0 || importing}>{importing ? "Importing…" : "Import"}</Button> </>}>
        <form id="import-form" onSubmit={handleImport}>
          <p className="mb-3 text-sm text-muted-dim">Paste or upload CSV: <strong className="text-foreground">email</strong>, optional name, optional phone.</p>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-(--card-border) bg-(--surface-elevated) px-4 py-2.5 text-sm font-medium text-muted hover:bg-(--surface-hover) transition-colors mb-3">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            Choose file
            <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={handleFileSelect} className="sr-only" />
          </label>
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="email, name, phone\njohn@example.com, John, +1234567890" rows={6} className="w-full resize-y rounded-(--radius) border border-(--card-border) bg-(--surface-elevated) px-4 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-dim focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--accent)/20" />
          {importText.trim().length > 0 && <p className="mt-3 text-xs font-medium text-muted">{getImportCount()} contact{getImportCount() !== 1 ? "s" : ""} will be imported</p>}
        </form>
      </Modal>

      <Modal open={showAddToGroup} onClose={() => setShowAddToGroup(false)} title="Add to group">
        <p className="text-sm text-muted mb-3">Add {selectedIds.size} subscriber{selectedIds.size !== 1 ? "s" : ""} to a group:</p>
        <ul className="space-y-2">
          {groups.map((g) => (
            <li key={g.id}>
              <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => handleAddToGroup(g.id)} disabled={addingToGroupId !== null}>
                {addingToGroupId === g.id ? "Adding…" : g.name}
              </Button>
            </li>
          ))}
        </ul>
        {groups.length === 0 && <p className="text-sm text-muted">No groups yet. Create one from the Groups tab.</p>}
      </Modal>
    </div>
  );
}

export default function SubscribersPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="spinner" />
      </div>
    }>
      <SubscribersPageInner />
    </Suspense>
  );
}
