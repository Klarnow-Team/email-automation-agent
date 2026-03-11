"use client";

import { type ReactNode } from "react";

export interface CardProps {
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Card({ title, children, footer, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-[var(--radius-xl)] border border-[var(--card-border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] transition-[box-shadow,border-color] duration-200 hover:shadow-[var(--shadow-md)] hover:border-[var(--card-border)] md:p-6 ${className}`}
    >
      {title && (
        <div className="mb-4 border-b border-[var(--card-border)] pb-3">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-[var(--muted-dim)]">
            {title}
          </h3>
        </div>
      )}
      <div className="min-w-0">{children}</div>
      {footer && (
        <div className="mt-4 flex items-center justify-end gap-2 border-t border-[var(--card-border)] pt-4">
          {footer}
        </div>
      )}
    </div>
  );
}
