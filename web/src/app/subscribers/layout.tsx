"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const VIEWS = [
  { view: "all", label: "All subscribers" },
  { view: "segments", label: "Segments" },
  { view: "groups", label: "Groups" },
  { view: "fields", label: "Fields" },
  { view: "stats", label: "Stats" },
  { view: "clean-up-inactive", label: "Clean up inactive" },
  { view: "history", label: "History" },
] as const;

function SubscribersLayoutShell({
  children,
  currentView,
}: {
  children: React.ReactNode;
  currentView: string;
}) {
  return (
    <div className="page-root subscribers-section">
      <header className="page-header subscribers-header-minimal">
        <h1 className="page-title text-xl font-semibold tracking-tight">Subscribers</h1>
      </header>

      <nav className="subscribers-subnav subscribers-subnav-minimal" aria-label="Subscribers sections">
        <ul className="subscribers-subnav-list">
          {VIEWS.map(({ view, label }) => {
            const isActive = currentView === view;
            const href = view === "all" ? "/subscribers" : `/subscribers?view=${view}`;
            return (
              <li key={view}>
                <Link
                  href={href}
                  className={`subscribers-subnav-link ${isActive ? "active" : ""}`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="subscribers-content">{children}</div>
    </div>
  );
}

function SubscribersLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") || "all";

  return <SubscribersLayoutShell currentView={currentView}>{children}</SubscribersLayoutShell>;
}

export default function SubscribersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<SubscribersLayoutShell currentView="all">{children}</SubscribersLayoutShell>}>
      <SubscribersLayoutContent>{children}</SubscribersLayoutContent>
    </Suspense>
  );
}
