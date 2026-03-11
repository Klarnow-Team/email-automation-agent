"use client";

export default function SitesPage() {
  return (
    <div className="page-root">
      <header className="page-header">
        <div>
          <h1 className="page-title">Sites</h1>
          <p className="page-subtitle">Landing pages and websites</p>
        </div>
      </header>
      <div className="rounded-xl border border-(--card-border) bg-(--card-bg-subtle) p-8 text-center">
        <p className="text-muted font-medium">Sites (landing pages and websites) are coming soon.</p>
        <p className="text-sm text-muted-dim mt-2">Use Forms to collect signups from your own site in the meantime.</p>
      </div>
    </div>
  );
}
