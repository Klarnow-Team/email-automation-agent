"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  dashboardApi,
  campaignsApi,
  type DashboardOverview,
  type Campaign,
} from "@/lib/api";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Button } from "@/components/ui";
import { useChartTheme } from "@/hooks/useChartTheme";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

const Icons = {
  Users: () => (
    <svg className="analytics-kpi-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Check: () => (
    <svg className="analytics-kpi-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Mail: () => (
    <svg className="analytics-kpi-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Eye: () => (
    <svg className="analytics-kpi-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  Cursor: () => (
    <svg className="analytics-kpi-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
    </svg>
  ),
  Chart: () => (
    <svg className="analytics-kpi-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Trend: () => (
    <svg className="analytics-chart-title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  Pie: () => (
    <svg className="analytics-chart-title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
    </svg>
  ),
  Bar: () => (
    <svg className="analytics-chart-title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Funnel: () => (
    <svg className="analytics-chart-title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  Gauge: () => (
    <svg className="analytics-chart-title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Radar: () => (
    <svg className="analytics-chart-title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  ),
  Campaign: () => (
    <svg className="analytics-chart-title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
    </svg>
  ),
  Scatter: () => (
    <svg className="analytics-chart-title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  Table: () => (
    <svg className="analytics-chart-title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
  EmptyChart: () => (
    <svg className="analytics-empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
};

function chartBase(theme: ReturnType<typeof useChartTheme>) {
  return {
    textStyle: { fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', color: theme.foreground },
    backgroundColor: "transparent",
  };
}

function tooltipStyle(theme: ReturnType<typeof useChartTheme>) {
  return {
    backgroundColor: theme.surfaceElevated,
    borderColor: theme.cardBorder,
    borderWidth: 1,
    textStyle: { color: theme.foreground, fontSize: 12 },
    padding: [10, 14],
    confine: true,
  };
}

function axisStyle(theme: ReturnType<typeof useChartTheme>) {
  return {
    axisLine: { lineStyle: { color: theme.cardBorder } },
    axisTick: { lineStyle: { color: theme.cardBorder } },
    axisLabel: { color: theme.mutedDim, fontSize: 11 },
    splitLine: { lineStyle: { color: theme.cardBorder, type: "dashed" as const, opacity: 0.5 } },
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function AnalyticsPage() {
  const theme = useChartTheme();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [growth, setGrowth] = useState<Array<{ date: string; count: number }>>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [growthPeriod, setGrowthPeriod] = useState<"7d" | "30d">("7d");

  useEffect(() => {
    Promise.all([
      dashboardApi.getOverview(),
      dashboardApi.getSubscriberGrowth(growthPeriod),
      campaignsApi.list(0, 100),
    ])
      .then(([ov, gr, camps]) => {
        setOverview(ov);
        setGrowth(gr);
        setCampaigns(camps ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [growthPeriod]);

  const sc = overview?.subscriber_counts ?? {
    total: 0,
    active: 0,
    unsubscribed: 0,
    bounced: 0,
    suppressed: 0,
  };
  const cp = overview?.campaign_performance ?? {
    emails_sent: 0,
    delivered: 0,
    opens: 0,
    clicks: 0,
    unsubscribes: 0,
    spam_complaints: 0,
  };
  const ap = overview?.automation_performance ?? {
    active_automations: 0,
    subscribers_in_automations: 0,
    emails_queued: 0,
    emails_sent_via_automation: 0,
  };
  const sentCampaigns = campaigns.filter((c) => c.status === "sent");

  // ECharts option: Subscriber growth (line + area)
  const growthChartOption = useMemo(
    () => ({
      ...chartBase(theme),
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross", lineStyle: { color: theme.cardBorder } },
        ...tooltipStyle(theme),
      },
      grid: { left: "3%", right: "4%", bottom: "12%", top: "10%", containLabel: true },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: growth.map((g) => g.date),
        ...axisStyle(theme),
        axisLabel: { ...axisStyle(theme).axisLabel, rotate: 45 },
      },
      yAxis: { type: "value", minInterval: 1, ...axisStyle(theme) },
      dataZoom: [
        { type: "inside", start: 0, end: 100 },
        {
          type: "slider",
          start: 0,
          end: 100,
          height: 20,
          bottom: 4,
          borderColor: "transparent",
          fillerColor: `rgba(${theme.accentRgb}, 0.2)`,
          handleStyle: { color: theme.accent },
          moveHandleStyle: { color: theme.accent },
          textStyle: { color: theme.mutedDim, fontSize: 10 },
          dataBackground: { lineStyle: { color: theme.mutedDim, opacity: 0.3 } },
        },
      ],
      series: [
        {
          name: "New subscribers",
          type: "line",
          smooth: true,
          lineStyle: { color: theme.accent, width: 2 },
          itemStyle: { color: theme.accent },
          areaStyle: { color: theme.accent, opacity: 0.25 },
          emphasis: { focus: "series", lineStyle: { width: 3 } },
          data: growth.map((g) => g.count),
        },
      ],
    }),
    [growth, theme]
  );

  // Subscriber distribution (pie)
  const subscriberPieOption = useMemo(
    () => ({
      ...chartBase(theme),
      tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)", ...tooltipStyle(theme) },
      legend: {
        orient: "vertical",
        right: 10,
        top: "center",
        textStyle: { color: theme.muted },
        itemGap: 12,
      },
      series: [
        {
          type: "pie",
          radius: ["42%", "72%"],
          center: ["38%", "50%"],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 10, borderColor: theme.surface, borderWidth: 2 },
          label: { show: true, formatter: "{b}\n{c}", color: theme.foreground, fontSize: 11 },
          emphasis: { label: { show: true }, itemStyle: { shadowBlur: 14, shadowColor: "rgba(0,0,0,0.3)" } },
          data: [
            { value: sc.active, name: "Active", itemStyle: { color: theme.success } },
            { value: sc.unsubscribed, name: "Unsubscribed", itemStyle: { color: theme.muted } },
            { value: sc.bounced, name: "Bounced", itemStyle: { color: theme.warning } },
            { value: sc.suppressed, name: "Suppressed", itemStyle: { color: theme.danger } },
          ].filter((d) => d.value > 0),
        },
      ],
    }),
    [sc, theme]
  );

  // Campaign performance (bar)
  const campaignPerfOption = useMemo(
    () => ({
      ...chartBase(theme),
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, ...tooltipStyle(theme) },
      grid: { left: "3%", right: "4%", bottom: "3%", top: "10%", containLabel: true },
      xAxis: {
        type: "category",
        data: ["Sent", "Delivered", "Opens", "Clicks", "Unsubs", "Spam"],
        ...axisStyle(theme),
      },
      yAxis: { type: "value", ...axisStyle(theme) },
      series: [
        {
          type: "bar",
          barWidth: "60%",
          barGap: 0,
          data: [cp.emails_sent, cp.delivered, cp.opens, cp.clicks, cp.unsubscribes, cp.spam_complaints],
          itemStyle: {
            color: (params: { dataIndex: number }) =>
              [theme.accent, `rgba(${theme.accentRgb}, 0.85)`, theme.success, `rgba(${theme.accentRgb}, 0.75)`, theme.warning, theme.danger][params.dataIndex],
          },
          emphasis: { focus: "series", itemStyle: { shadowBlur: 10 } },
        },
      ],
    }),
    [cp, theme]
  );

  // Top campaigns by opens (horizontal bar)
  const topCampaignsByOpensOption = useMemo(
    () => {
      const top = [...sentCampaigns]
        .sort((a, b) => (b.opens ?? 0) - (a.opens ?? 0))
        .slice(0, 8);
      return {
        ...chartBase(theme),
        tooltip: { trigger: "axis", ...tooltipStyle(theme) },
        legend: { textStyle: { color: theme.muted }, bottom: 0 },
        grid: { left: "15%", right: "10%", bottom: "15%", top: "5%", containLabel: true },
        xAxis: { type: "value", ...axisStyle(theme) },
        yAxis: {
          type: "category",
          data: top.map((c) => c.name.slice(0, 25) + (c.name.length > 25 ? "…" : "")),
          ...axisStyle(theme),
          axisLabel: { ...axisStyle(theme).axisLabel, width: 100, overflow: "truncate" },
        },
        series: [
          { name: "Opens", type: "bar", barGap: 0, data: top.map((c) => c.opens ?? 0), itemStyle: { color: theme.success } },
          { name: "Clicks", type: "bar", data: top.map((c) => c.clicks ?? 0), itemStyle: { color: theme.accent } },
        ],
      };
    },
    [sentCampaigns, theme]
  );

  // Open rate vs Click rate scatter
  const scatterOption = useMemo(
    () => {
      const points = sentCampaigns
        .filter((c) => (c.sent_count ?? 0) > 0)
        .map((c) => {
          const sent = c.sent_count ?? 1;
          return {
            name: c.name,
            value: [
              ((c.opens ?? 0) / sent) * 100,
              ((c.clicks ?? 0) / sent) * 100,
              c.sent_count,
            ],
          };
        });
      return {
        ...chartBase(theme),
        tooltip: {
          formatter: (p: unknown) => {
            const d = (p as { data: { name: string; value: number[] } }).data;
            return `${d.name}<br/>Open: ${d.value[0].toFixed(1)}%<br/>Click: ${d.value[1].toFixed(1)}%<br/>Sent: ${d.value[2]}`;
          },
          ...tooltipStyle(theme),
        },
        grid: { left: "12%", right: "14%", bottom: "12%", top: "10%", containLabel: true },
        xAxis: {
          type: "value",
          name: "Open rate %",
          nameLocation: "middle",
          nameGap: 30,
          nameTextStyle: { color: theme.mutedDim },
          min: 0,
          max: 100,
          ...axisStyle(theme),
        },
        yAxis: {
          type: "value",
          name: "Click rate %",
          nameLocation: "middle",
          nameGap: 40,
          nameTextStyle: { color: theme.mutedDim },
          min: 0,
          max: 100,
          ...axisStyle(theme),
        },
        visualMap: {
          min: 0,
          max: Math.max(1, ...points.map((p) => p.value[2] ?? 0)),
          dimension: 2,
          orient: "vertical",
          right: 5,
          top: "center",
          text: ["High", "Low"],
          textStyle: { color: theme.mutedDim },
          inRange: { color: [theme.accent, `rgba(${theme.accentRgb}, 0.5)`] },
        },
        series: [{ type: "scatter", symbolSize: 18, data: points, itemStyle: { borderColor: theme.surface, borderWidth: 1 } }],
      };
    },
    [sentCampaigns, theme]
  );

  // Funnel: Sent -> Opened -> Clicked
  const funnelOption = useMemo(
    () => ({
      ...chartBase(theme),
      tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)", ...tooltipStyle(theme) },
      series: [
        {
          type: "funnel",
          left: "10%",
          top: 20,
          bottom: 20,
          width: "80%",
          minSize: "20%",
          maxSize: "100%",
          sort: "descending",
          gap: 3,
          itemStyle: { borderColor: theme.surface, borderWidth: 2 },
          label: { show: true, position: "inside", color: theme.foreground, fontSize: 12 },
          emphasis: { label: { fontSize: 14 } },
          data: [
            { value: cp.emails_sent, name: "Sent", itemStyle: { color: theme.accent } },
            { value: cp.opens, name: "Opened", itemStyle: { color: `rgba(${theme.accentRgb}, 0.75)` } },
            { value: cp.clicks, name: "Clicked", itemStyle: { color: theme.success } },
          ].filter((d) => d.value > 0),
        },
      ],
    }),
    [cp, theme]
  );

  // Gauge: Overall open rate
  const openRateGaugeOption = useMemo(
    () => {
      const rate = cp.emails_sent > 0 ? (cp.opens / cp.emails_sent) * 100 : 0;
      return {
        ...chartBase(theme),
        series: [
          {
            type: "gauge",
            startAngle: 180,
            endAngle: 0,
            min: 0,
            max: 100,
            splitNumber: 10,
            progress: {
              show: true,
              width: 20,
              itemStyle: { color: theme.accent },
              roundedCap: true,
            },
            axisLine: {
              lineStyle: {
                width: 20,
                color: [[1, theme.cardBorder]],
              },
            },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            anchor: { show: true, size: 18, itemStyle: { borderColor: theme.accent } },
            title: { offsetCenter: [0, "80%"], fontSize: 12, color: theme.mutedDim },
            detail: {
              valueAnimation: true,
              fontSize: 28,
              offsetCenter: [0, "40%"],
              formatter: "{value}%",
              color: theme.foreground,
            },
            data: [{ value: Math.round(rate * 10) / 10, name: "Open rate" }],
          },
        ],
      };
    },
    [cp, theme]
  );

  // Top campaigns by open rate (horizontal bar)
  const topCampaignsByOpenRateOption = useMemo(
    () => {
      const top = sentCampaigns
        .filter((c) => (c.sent_count ?? 0) > 0)
        .map((c) => ({
          name: c.name.slice(0, 30) + (c.name.length > 30 ? "…" : ""),
          rate: ((c.opens ?? 0) / (c.sent_count ?? 1)) * 100,
        }))
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 8);
      return {
        ...chartBase(theme),
        tooltip: { trigger: "axis", ...tooltipStyle(theme) },
        grid: { left: "15%", right: "15%", bottom: "3%", top: "5%", containLabel: true },
        xAxis: { type: "value", min: 0, max: 100, ...axisStyle(theme), axisLabel: { ...axisStyle(theme).axisLabel, formatter: "{value}%" } },
        yAxis: { type: "category", data: top.map((t) => t.name), ...axisStyle(theme), axisLabel: { ...axisStyle(theme).axisLabel, width: 80, overflow: "truncate" } },
        series: [{ type: "bar", barWidth: "65%", data: top.map((t) => t.rate), itemStyle: { color: theme.accent } }],
      };
    },
    [sentCampaigns, theme]
  );

  // Automation performance (radar)
  const automationRadarOption = useMemo(
    () => ({
      ...chartBase(theme),
      tooltip: { trigger: "item", ...tooltipStyle(theme) },
      radar: {
        indicator: [
          { name: "Active", max: Math.max(1, ap.active_automations) },
          { name: "In progress", max: Math.max(1, ap.subscribers_in_automations) },
          { name: "Queued", max: Math.max(1, ap.emails_queued) },
          { name: "Sent via auto", max: Math.max(1, ap.emails_sent_via_automation) },
        ],
        axisName: { color: theme.muted },
        splitArea: { areaStyle: { color: [`rgba(${theme.accentRgb}, 0.04)`, "transparent"] } },
        splitLine: { lineStyle: { color: theme.cardBorder } },
        axisLine: { lineStyle: { color: theme.cardBorder } },
      },
      series: [
        {
          type: "radar",
          data: [
            {
              value: [
                ap.active_automations,
                ap.subscribers_in_automations,
                ap.emails_queued,
                ap.emails_sent_via_automation,
              ],
              name: "Automation",
              lineStyle: { color: theme.accent, width: 2 },
              itemStyle: { color: theme.accent },
              areaStyle: { color: theme.accent, opacity: 0.25 },
            },
          ],
        },
      ],
    }),
    [ap, theme]
  );

  if (loading)
    return (
      <div className="page-root analytics-page">
        <header className="analytics-hero">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold">Analytics</h1>
            <p className="text-sm text-muted-dim mt-1">Campaign and subscriber insights</p>
          </div>
        </header>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 py-16">
          <div className="spinner" />
          <p className="text-sm font-medium text-muted-dim">Loading analytics…</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="page-root analytics-page">
        <header className="analytics-hero">
          <h1 className="text-2xl font-display font-bold">Analytics</h1>
        </header>
        <div className="alert-error animate-in">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="alert-dismiss" aria-label="Dismiss">
            Dismiss
          </button>
        </div>
      </div>
    );

  return (
    <div className="page-root analytics-page">
      <header className="analytics-hero animate-in flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl">Analytics</h1>
          <p className="text-sm text-muted-dim mt-1 max-w-xl">
            Campaign performance, subscriber insights, and engagement metrics at a glance.
          </p>
        </div>
        <Link href="/campaigns" className="shrink-0"><Button>View campaigns</Button></Link>
      </header>

      {/* KPI cards */}
      <section className="analytics-kpi-grid animate-in" style={{ animationDelay: "50ms" }}>
        <div className="analytics-kpi">
          <Icons.Users />
          <p className="analytics-kpi-value text-foreground"><AnimatedCounter value={sc.total} /></p>
          <p className="analytics-kpi-label">Total subscribers</p>
        </div>
        <div className="analytics-kpi kpi-success">
          <Icons.Check />
          <p className="analytics-kpi-value text-success"><AnimatedCounter value={sc.active} /></p>
          <p className="analytics-kpi-label">Active</p>
        </div>
        <div className="analytics-kpi">
          <Icons.Mail />
          <p className="analytics-kpi-value text-foreground"><AnimatedCounter value={cp.emails_sent} /></p>
          <p className="analytics-kpi-label">Emails sent</p>
        </div>
        <div className="analytics-kpi">
          <Icons.Eye />
          <p className="analytics-kpi-value text-foreground"><AnimatedCounter value={cp.opens} /></p>
          <p className="analytics-kpi-label">Opens</p>
        </div>
        <div className="analytics-kpi">
          <Icons.Cursor />
          <p className="analytics-kpi-value text-foreground"><AnimatedCounter value={cp.clicks} /></p>
          <p className="analytics-kpi-label">Clicks</p>
        </div>
        <div className="analytics-kpi">
          <Icons.Chart />
          <p className="analytics-kpi-value text-foreground">
            {cp.emails_sent > 0 ? `${((cp.opens / cp.emails_sent) * 100).toFixed(1)}%` : "—"}
          </p>
          <p className="analytics-kpi-label">Open rate</p>
        </div>
      </section>

      {/* Chart grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mt-6">
        {/* Subscriber growth — line + area */}
        <section className="analytics-chart-card animate-in">
          <div className="analytics-chart-header">
            <h2 className="analytics-chart-title"><Icons.Trend /> Subscriber growth</h2>
            <div className="analytics-period-toggle">
              <button
                type="button"
                onClick={() => setGrowthPeriod("7d")}
                className={growthPeriod === "7d" ? "active" : ""}
              >
                7d
              </button>
              <button
                type="button"
                onClick={() => setGrowthPeriod("30d")}
                className={growthPeriod === "30d" ? "active" : ""}
              >
                30d
              </button>
            </div>
          </div>
          <ReactECharts option={growthChartOption} style={{ height: 280 }} opts={{ renderer: "canvas" }} notMerge lazyUpdate />
        </section>

        {/* Subscriber distribution pie */}
        <section className="analytics-chart-card animate-in">
          <h2 className="analytics-chart-title mb-4"><Icons.Pie /> Subscriber distribution</h2>
          {sc.total > 0 ? (
            <ReactECharts option={subscriberPieOption} style={{ height: 280 }} opts={{ renderer: "canvas" }} notMerge lazyUpdate />
          ) : (
            <div className="analytics-empty-state">
              <Icons.EmptyChart />
              <p className="analytics-empty-text">No subscribers yet</p>
            </div>
          )}
        </section>

        {/* Campaign performance bar */}
        <section className="analytics-chart-card animate-in">
          <h2 className="analytics-chart-title mb-4"><Icons.Bar /> Campaign performance (all-time)</h2>
          <ReactECharts option={campaignPerfOption} style={{ height: 260 }} opts={{ renderer: "canvas" }} notMerge lazyUpdate />
        </section>

        {/* Engagement funnel */}
        <section className="analytics-chart-card animate-in">
          <h2 className="analytics-chart-title mb-4"><Icons.Funnel /> Engagement funnel</h2>
          {cp.emails_sent > 0 ? (
            <ReactECharts option={funnelOption} style={{ height: 260 }} opts={{ renderer: "canvas" }} notMerge lazyUpdate />
          ) : (
            <div className="analytics-empty-state">
              <Icons.EmptyChart />
              <p className="analytics-empty-text">No campaign data yet</p>
            </div>
          )}
        </section>

        {/* Open rate gauge */}
        <section className="analytics-chart-card animate-in">
          <h2 className="analytics-chart-title mb-4"><Icons.Gauge /> Overall open rate</h2>
          <ReactECharts option={openRateGaugeOption} style={{ height: 220 }} opts={{ renderer: "canvas" }} notMerge lazyUpdate />
        </section>

        {/* Automation radar */}
        <section className="analytics-chart-card animate-in">
          <h2 className="analytics-chart-title mb-4"><Icons.Radar /> Automation performance</h2>
          <ReactECharts option={automationRadarOption} style={{ height: 260 }} opts={{ renderer: "canvas" }} notMerge lazyUpdate />
        </section>

        {/* Top campaigns by opens (grouped bar) */}
        <section className="analytics-chart-card animate-in">
          <h2 className="analytics-chart-title mb-4"><Icons.Campaign /> Top campaigns — opens & clicks</h2>
          {sentCampaigns.length > 0 ? (
            <ReactECharts option={topCampaignsByOpensOption} style={{ height: 300 }} opts={{ renderer: "canvas" }} notMerge lazyUpdate />
          ) : (
            <div className="analytics-empty-state">
              <Icons.EmptyChart />
              <p className="analytics-empty-text">No sent campaigns yet</p>
            </div>
          )}
        </section>

        {/* Top campaigns by open rate */}
        <section className="analytics-chart-card animate-in">
          <h2 className="analytics-chart-title mb-4"><Icons.Chart /> Top campaigns — open rate %</h2>
          {sentCampaigns.filter((c) => (c.sent_count ?? 0) > 0).length > 0 ? (
            <ReactECharts option={topCampaignsByOpenRateOption} style={{ height: 300 }} opts={{ renderer: "canvas" }} notMerge lazyUpdate />
          ) : (
            <div className="analytics-empty-state">
              <Icons.EmptyChart />
              <p className="analytics-empty-text">No campaign data yet</p>
            </div>
          )}
        </section>

        {/* Scatter: Open rate vs Click rate */}
        <section className="analytics-chart-card animate-in lg:col-span-2">
          <h2 className="analytics-chart-title mb-1"><Icons.Scatter /> Campaign comparison — open rate vs click rate</h2>
          <p className="text-xs text-muted-dim mb-4">Each point is a campaign. Bubble size = emails sent. Hover for details.</p>
          {sentCampaigns.filter((c) => (c.sent_count ?? 0) > 0).length > 0 ? (
            <ReactECharts option={scatterOption} style={{ height: 320 }} opts={{ renderer: "canvas" }} notMerge lazyUpdate />
          ) : (
            <div className="analytics-empty-state">
              <Icons.EmptyChart />
              <p className="analytics-empty-text">No campaign data yet</p>
            </div>
          )}
        </section>
      </div>

      {/* Campaign table */}
      <section className="analytics-chart-card mt-8 animate-in">
        <div className="analytics-chart-header mb-4">
          <h2 className="analytics-chart-title"><Icons.Table /> Campaign details</h2>
          <Link href="/campaigns" className="text-sm font-medium text-(--accent) hover:text-(--accent-hover) transition-colors">
            View all →
          </Link>
        </div>
        {sentCampaigns.length === 0 ? (
          <div className="analytics-empty-state py-12">
            <Icons.EmptyChart />
            <p className="analytics-empty-text">No sent campaigns yet. Send a campaign to see analytics.</p>
          </div>
        ) : (
          <div className="analytics-table-wrap">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Subject</th>
                  <th className="text-right">Sent</th>
                  <th className="text-right">Opens</th>
                  <th className="text-right">Clicks</th>
                  <th>Open rate</th>
                  <th>Click rate</th>
                  <th>Sent at</th>
                </tr>
              </thead>
              <tbody>
                {sentCampaigns.map((c) => {
                  const sent = c.sent_count ?? 0;
                  const opens = c.opens ?? 0;
                  const clicks = c.clicks ?? 0;
                  const openRateVal = sent > 0 ? (opens / sent) * 100 : 0;
                  const clickRateVal = sent > 0 ? (clicks / sent) * 100 : 0;
                  const openRate = sent > 0 ? openRateVal.toFixed(1) : "—";
                  const clickRate = sent > 0 ? clickRateVal.toFixed(1) : "—";
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link href="/campaigns" className="text-foreground hover:text-(--accent) font-medium transition-colors">
                          {c.name}
                        </Link>
                      </td>
                      <td className="text-muted truncate max-w-[200px]" title={c.subject}>
                        {c.subject}
                      </td>
                      <td className="text-right tabular-nums">{sent}</td>
                      <td className="text-right tabular-nums">{opens}</td>
                      <td className="text-right tabular-nums">{clicks}</td>
                      <td>
                        {openRate === "—" ? (
                          "—"
                        ) : (
                          <div className="analytics-rate-bar">
                            <div className="analytics-rate-bar-track">
                              <div
                                className="analytics-rate-bar-fill"
                                style={{
                                  width: `${Math.min(openRateVal, 100)}%`,
                                  backgroundColor: "var(--success)",
                                }}
                              />
                            </div>
                            <span className="tabular-nums text-foreground font-medium shrink-0 w-10 text-right">{openRate}%</span>
                          </div>
                        )}
                      </td>
                      <td>
                        {clickRate === "—" ? (
                          "—"
                        ) : (
                          <div className="analytics-rate-bar">
                            <div className="analytics-rate-bar-track">
                              <div
                                className="analytics-rate-bar-fill"
                                style={{
                                  width: `${Math.min(clickRateVal, 100)}%`,
                                  backgroundColor: "var(--accent)",
                                }}
                              />
                            </div>
                            <span className="tabular-nums text-foreground font-medium shrink-0 w-10 text-right">{clickRate}%</span>
                          </div>
                        )}
                      </td>
                      <td className="text-muted-dim text-xs">{formatDate(c.sent_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
