"use client";

import { usePathname } from "next/navigation";
import { Dropdown } from "@/components/ui";

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/analytics": "Analytics",
  "/subscribers": "Subscribers",
  "/subscribers/profile": "Subscriber profile",
  "/campaigns": "Campaigns",
  "/automations": "Automations",
  "/segments": "Segments",
  "/groups": "Groups",
  "/tags": "Tags",
  "/suppression": "Suppression",
  "/forms": "Forms",
  "/bookings": "Bookings",
  "/bookings/availability": "Availability",
  "/bookings/event-types/new": "New event type",
  "/bookings/event-types/edit": "Edit event type",
  "/book": "Book",
  "/manual": "Manual",
  "/profile": "Profile",
  "/team": "Team",
  "/webhooks": "Webhooks",
  "/audit-logs": "Audit logs",
  "/unsubscribe": "Unsubscribe",
};

function getPageTitle(pathname: string): string {
  if (routeTitles[pathname]) return routeTitles[pathname];
  for (const [path, title] of Object.entries(routeTitles)) {
    if (path !== "/" && pathname.startsWith(path)) return title;
  }
  const segment = pathname.split("/").filter(Boolean)[0];
  if (!segment) return "Dashboard";
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
}

export function TopBar() {
  const pathname = usePathname();
  const title = getPageTitle(pathname ?? "/");

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b border-[var(--card-border)] bg-[var(--background)] px-4 sm:px-6">
      <h1 className="font-display text-lg font-semibold tracking-tight text-[var(--foreground)] truncate">
        {title}
      </h1>
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden sm:block">
          <input
            type="search"
            placeholder="Search..."
            className="w-48 rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-dim)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/20"
            aria-label="Search"
          />
        </div>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
          aria-label="Notifications"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
        <Dropdown
          align="right"
          trigger={
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--on-accent)] font-medium transition-opacity hover:opacity-90"
              aria-label="Profile menu"
            >
              U
            </button>
          }
        >
          <div className="py-1">
            <a
              href="/profile"
              className="block px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
            >
              Profile
            </a>
            <a
              href="/manual"
              className="block px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
            >
              Help
            </a>
          </div>
        </Dropdown>
      </div>
    </header>
  );
}
