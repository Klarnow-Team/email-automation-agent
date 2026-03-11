"use client";

import {
  useState,
  useRef,
  useEffect,
  type ReactNode,
  useCallback,
} from "react";
import { createPortal } from "react-dom";

export interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
}

export function Dropdown({
  trigger,
  children,
  align = "left",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    const menuEl = menuRef.current;
    if (!triggerEl || !menuEl || !open) return;
    const rect = triggerEl.getBoundingClientRect();
    menuEl.style.position = "fixed";
    menuEl.style.top = `${rect.bottom + 4}px`;
    menuEl.style.left =
      align === "right" ? `${rect.right - menuEl.offsetWidth}px` : `${rect.left}px`;
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      )
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        className="cursor-pointer"
      >
        {trigger}
      </div>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            onClick={() => setOpen(false)}
            className="z-[60] min-w-[10rem] rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--surface)] py-1 shadow-[var(--shadow-lg)]"
          >
            {children}
          </div>,
          document.body
        )}
    </div>
  );
}
