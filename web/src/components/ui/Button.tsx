"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-[var(--accent)] text-[var(--on-accent)] hover:opacity-90 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]",
  secondary: "bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--card-border)] hover:bg-[var(--surface-hover)] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]",
  ghost: "bg-transparent text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]",
  danger: "bg-[var(--danger-muted)] text-[var(--danger)] hover:opacity-90 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--danger)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm rounded-[10px]",
  md: "px-5 py-2.5 text-[0.9375rem] font-medium rounded-[var(--radius)]",
  lg: "px-6 py-3 text-base font-medium rounded-[var(--radius)]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    const { variant = "primary", size = "md", className = "", disabled, type = "button", ...rest } = props;
    const cls = "inline-flex items-center justify-center gap-2 transition-all duration-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 " + variantClasses[variant] + " " + sizeClasses[size] + " " + className;
    return <button ref={ref} type={type} disabled={disabled} className={cls} {...rest} />;
  }
);

Button.displayName = "Button";

export { Button };
