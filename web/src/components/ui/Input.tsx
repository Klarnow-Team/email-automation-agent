"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id: idProp, ...props }, ref) => {
    const id = idProp ?? `input-${Math.random().toString(36).slice(2, 9)}`;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block mb-1.5 text-[0.8125rem] font-medium text-[var(--muted-dim)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`w-full rounded-[var(--radius)] border bg-[var(--surface-elevated)] px-4 py-2.5 text-[0.9375rem] text-[var(--foreground)] placeholder:text-[var(--muted-dim)] transition-colors duration-200 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:border ${
            error
              ? "border-[var(--danger)]"
              : "border-[var(--card-border)] hover:border-[var(--muted-dim)]"
          } ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        {error && (
          <p
            id={`${id}-error`}
            className="mt-1.5 text-sm text-[var(--danger)]"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
