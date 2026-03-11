"use client";

export type BadgeVariant = "draft" | "sent" | "active" | "neutral";

const variantClasses: Record<BadgeVariant, string> = {
  draft: "bg-[var(--warning-muted)] text-[var(--warning)]",
  sent: "bg-[var(--success-muted)] text-[var(--success)]",
  active: "bg-[rgba(var(--accent-rgb),0.15)] text-[var(--accent)]",
  neutral: "bg-[var(--card-bg-subtle)] text-[var(--muted-dim)]",
};

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "neutral", children, className = "" }: BadgeProps) {
  return (
    <span
      className={"inline-flex items-center rounded px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide " + variantClasses[variant] + " " + className}
    >
      {children}
    </span>
  );
}
