"use client";

import { useEffect, useState } from "react";

function getVar(name: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "";
}

export type ChartTheme = {
  foreground: string;
  muted: string;
  mutedDim: string;
  accent: string;
  accentRgb: string;
  success: string;
  warning: string;
  danger: string;
  surface: string;
  surfaceElevated: string;
  cardBorder: string;
};

const defaults: ChartTheme = {
  foreground: "#f0eef4",
  muted: "#9a96a3",
  mutedDim: "#5c5866",
  accent: "#9d8cf9",
  accentRgb: "157, 140, 249",
  success: "#34d399",
  warning: "#fbbf24",
  danger: "#f87171",
  surface: "#0a0a0a",
  surfaceElevated: "#0f0f0f",
  cardBorder: "rgba(255, 255, 255, 0.06)",
};

export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(defaults);

  useEffect(() => {
    const read = () =>
      setTheme({
        foreground: getVar("--foreground") || defaults.foreground,
        muted: getVar("--muted") || defaults.muted,
        mutedDim: getVar("--muted-dim") || defaults.mutedDim,
        accent: getVar("--accent") || defaults.accent,
        accentRgb: getVar("--accent-rgb") || defaults.accentRgb,
        success: getVar("--success") || defaults.success,
        warning: getVar("--warning") || defaults.warning,
        danger: getVar("--danger") || defaults.danger,
        surface: getVar("--surface") || defaults.surface,
        surfaceElevated: getVar("--surface-elevated") || defaults.surfaceElevated,
        cardBorder: getVar("--card-border") || defaults.cardBorder,
      });

    read();

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === "data-theme") {
          read();
          break;
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  return theme;
}
