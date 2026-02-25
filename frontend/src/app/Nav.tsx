"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { ThemeToggle } from "./ThemeToggle";

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

const calendarIcon = (
  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const bookPreviewIcon = (
  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
  </svg>
);

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  dropdown?: Array<{ href: string; label: string }>;
};

const navGroups: Array<{ label: string; links: NavItem[] }> = [
  {
    label: "Main",
    links: [
      {
        href: "/",
        label: "Dashboard",
        icon: (
          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Email",
    links: [
      {
        href: "/subscribers",
        label: "Subscribers",
        icon: (
          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        href: "/campaigns",
        label: "Campaigns",
        icon: (
          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        ),
      },
      {
        href: "/automations",
        label: "Automations",
        icon: (
          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
      },
      {
        href: "/segments",
        label: "Segments",
        icon: (
          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        ),
      },
      {
        href: "/groups",
        label: "Groups",
        icon: (
          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        href: "/tags",
        label: "Tags",
        icon: (
          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        ),
      },
      {
        href: "/suppression",
        label: "Suppression",
        icon: (
          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        ),
      },
      {
        href: "/forms",
        label: "Forms",
        icon: (
          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Bookings",
    links: [
      {
        href: "/bookings",
        label: "Bookings",
        icon: calendarIcon,
        dropdown: [{ href: "/book", label: "Book (preview)" }],
      },
    ],
  },
  {
    label: "Account",
    links: [
      {
        href: "/profile",
        label: "Profile",
        icon: (
          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
      },
    ],
  },
];

export function Nav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [bookingsDropdownOpen, setBookingsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const portalDropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  const updateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    if (collapsed) {
      setDropdownPosition({ top: rect.top, left: rect.right + 6 });
    } else {
      setDropdownPosition({ top: rect.bottom + 2, left: rect.left });
    }
  }, [collapsed]);

  const openBookingsDropdown = useCallback(() => {
    updateDropdownPosition();
    setBookingsDropdownOpen(true);
  }, [updateDropdownPosition]);

  useEffect(() => {
    if (bookingsDropdownOpen) {
      updateDropdownPosition();
      window.addEventListener("scroll", updateDropdownPosition, true);
      window.addEventListener("resize", updateDropdownPosition);
      return () => {
        window.removeEventListener("scroll", updateDropdownPosition, true);
        window.removeEventListener("resize", updateDropdownPosition);
      };
    }
  }, [bookingsDropdownOpen, updateDropdownPosition]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
        setCollapsed(saved);
      } catch {
        /* ignore */
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    document.body.dataset.sidebarCollapsed = collapsed ? "true" : "false";
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    if (!bookingsDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current?.contains(target) ||
        portalDropdownRef.current?.contains(target)
      )
        return;
      setBookingsDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [bookingsDropdownOpen]);

  const isCollapsed = collapsed;

  return (
    <aside
      className={`sidebar fixed left-0 top-0 z-50 flex h-full flex-col max-md:w-18 ${
        isCollapsed ? "sidebar-collapsed w-18" : "w-60"
      }`}
      aria-label="Main navigation"
    >
      <div className={`flex flex-col flex-1 min-h-0 ${isCollapsed ? "px-3 py-4 items-center gap-0.5" : "px-3 pt-4 pb-3 gap-0.5 max-md:px-3"}`}>
        <div className={`flex items-center w-full min-w-0 shrink-0 ${isCollapsed ? "justify-center" : "mb-2"}`}>
          <Link
            href="/"
            className={`sidebar-logo flex items-center rounded-lg py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)/40 focus-visible:ring-offset-2 focus-visible:ring-offset-(--surface) ${
              isCollapsed ? "justify-center p-0 w-fit" : "gap-2.5 pl-2.5 pr-2.5 min-w-0 overflow-hidden"
            } max-md:justify-center max-md:px-2`}
            title="Klarnow"
          >
            <span className={`sidebar-logo-mark shrink-0 flex items-center justify-center rounded-lg overflow-hidden ${isCollapsed ? "h-8 w-8" : "h-8 w-8"}`}>
              <img src="/light-klarnow-logo.svg" alt="" className="sidebar-logo-icon sidebar-logo-icon-light h-full w-full object-contain" aria-hidden />
              <img src="/dark-klarnow-logo.svg" alt="" className="sidebar-logo-icon sidebar-logo-icon-dark h-full w-full object-contain" aria-hidden />
            </span>
            <img
              src="/klarnow-header-logo.svg"
              alt="Klarnow"
              className={`sidebar-wordmark shrink-0 h-[18px] w-auto object-contain max-md:sr-only ${isCollapsed ? "absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden" : "opacity-100"}`}
            />
          </Link>
        </div>

        <nav className={`flex flex-col flex-1 w-full min-h-0 mt-1 overflow-y-auto ${isCollapsed ? "items-center gap-0" : "gap-0 max-md:items-center"}`}>
          {navGroups.map((group) => (
            <div key={group.label} className="w-full min-w-0">
              {!isCollapsed && (
                <p className="sidebar-group-label" aria-hidden>
                  {group.label}
                </p>
              )}
              {group.links.map(({ href, label, icon, dropdown }) => {
                const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
                const isBookings = href === "/bookings";
                const hasDropdown = isBookings && dropdown && dropdown.length > 0;

                if (hasDropdown) {
                  return (
                    <div key={href} ref={dropdownRef} className="sidebar-dropdown-wrap relative w-full">
                      <div
                        ref={triggerRef}
                        className={`sidebar-link relative flex items-center rounded-lg py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)/40 focus-visible:ring-offset-2 focus-visible:ring-offset-(--surface) w-full ${
                          isCollapsed ? "justify-center px-0" : "gap-2.5 pl-2.5 pr-2 max-md:justify-center max-md:px-2"
                        } ${pathname === "/bookings" || pathname.startsWith("/book") ? "sidebar-link-active" : "text-muted"}`}
                      >
                        <Link
                          href={href}
                          title={label}
                          className={`flex items-center min-w-0 ${isCollapsed ? "justify-center" : "gap-2.5 flex-1"}`}
                        >
                          {pathname === "/bookings" && !isCollapsed && (
                            <span className="sidebar-indicator absolute left-0 top-1/2 -translate-y-1/2 h-5" aria-hidden />
                          )}
                          <span className="shrink-0 text-current relative z-1">{icon}</span>
                          <span
                            className={`sidebar-label whitespace-nowrap relative z-1 ${
                              isCollapsed ? "w-0 overflow-hidden opacity-0" : "overflow-hidden max-md:sr-only"
                            }`}
                          >
                            {label}
                          </span>
                        </Link>
                        {!isCollapsed && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              if (bookingsDropdownOpen) setBookingsDropdownOpen(false);
                              else openBookingsDropdown();
                            }}
                            className="sidebar-dropdown-trigger shrink-0 p-0.5 rounded text-muted hover:text-foreground hover:bg-(--surface-hover)"
                            aria-expanded={bookingsDropdownOpen}
                            aria-haspopup="true"
                            title="More"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        )}
                        {isCollapsed && (
                          <button
                            type="button"
                            onClick={() => {
                              if (bookingsDropdownOpen) setBookingsDropdownOpen(false);
                              else openBookingsDropdown();
                            }}
                            className="absolute inset-0"
                            aria-expanded={bookingsDropdownOpen}
                            aria-haspopup="true"
                            title={label}
                          />
                        )}
                      </div>
                      {bookingsDropdownOpen &&
                        typeof document !== "undefined" &&
                        createPortal(
                          <div
                            ref={portalDropdownRef}
                            className={`sidebar-dropdown sidebar-dropdown-portal ${isCollapsed ? "sidebar-dropdown-collapsed" : ""}`}
                            style={{
                              position: "fixed",
                              top: dropdownPosition.top,
                              left: dropdownPosition.left,
                            }}
                          >
                            <Link
                              href="/bookings"
                              onClick={() => setBookingsDropdownOpen(false)}
                              className={`sidebar-dropdown-item ${pathname === "/bookings" ? "sidebar-dropdown-item-active" : ""}`}
                            >
                              {calendarIcon}
                              <span>Bookings</span>
                            </Link>
                            {dropdown.map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setBookingsDropdownOpen(false)}
                                className={`sidebar-dropdown-item ${pathname === item.href ? "sidebar-dropdown-item-active" : ""}`}
                              >
                                {bookPreviewIcon}
                                <span>{item.label}</span>
                              </Link>
                            ))}
                          </div>,
                          document.body
                        )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={href}
                    href={href}
                    title={label}
                    className={`sidebar-link relative flex items-center rounded-lg py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)/40 focus-visible:ring-offset-2 focus-visible:ring-offset-(--surface) w-full ${
                      isCollapsed ? "justify-center px-0" : "gap-2.5 pl-2.5 pr-2.5 max-md:justify-center max-md:px-2"
                    } ${isActive ? "sidebar-link-active" : "text-muted"}`}
                  >
                    {isActive && !isCollapsed && (
                      <span
                        className="sidebar-indicator absolute left-0 top-1/2 -translate-y-1/2 h-5"
                        aria-hidden
                      />
                    )}
                    <span className="shrink-0 text-current relative z-1">{icon}</span>
                    <span
                      className={`sidebar-label whitespace-nowrap relative z-1 ${
                        isCollapsed ? "w-0 overflow-hidden opacity-0" : "overflow-hidden max-md:sr-only"
                      }`}
                    >
                      {label}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer shrink-0 pt-3 mt-auto border-t border-(--card-border)">
          {!isCollapsed && (
            <p className="sidebar-footer-label" aria-hidden>
              Help &amp; preferences
            </p>
          )}
          <div className="sidebar-footer-actions">
            <Link
              href="/manual"
              title="Manual"
              className={`sidebar-link relative flex items-center rounded-lg py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)/40 focus-visible:ring-offset-2 focus-visible:ring-offset-(--surface) w-full ${
                pathname === "/manual" ? "sidebar-link-active" : "text-muted"
              } ${isCollapsed ? "justify-center px-0" : "gap-2.5 pl-2.5 pr-2.5"}`}
            >
              {pathname === "/manual" && !isCollapsed && (
                <span className="sidebar-indicator absolute left-0 top-1/2 -translate-y-1/2 h-5" aria-hidden />
              )}
              <span className="shrink-0 text-current relative z-1">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </span>
              <span className={`sidebar-label whitespace-nowrap relative z-1 ${isCollapsed ? "w-0 overflow-hidden opacity-0" : "opacity-100"}`}>
                Manual
              </span>
            </Link>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className={`sidebar-collapse-btn flex items-center rounded-lg py-2 text-sm font-medium text-muted-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)/40 focus-visible:ring-offset-2 focus-visible:ring-offset-(--surface) w-full ${
                isCollapsed ? "justify-center px-0" : "gap-2.5 pl-2.5 pr-2.5"
              }`}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!isCollapsed}
            >
              <svg
                className={`h-5 w-5 shrink-0 ${isCollapsed ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8.14 0l-7 7 7 7" />
              </svg>
              <span
                className={`sidebar-label overflow-hidden whitespace-nowrap ${
                  isCollapsed ? "w-0 opacity-0" : "opacity-100"
                }`}
              >
                {isCollapsed ? "Expand" : "Collapse"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
