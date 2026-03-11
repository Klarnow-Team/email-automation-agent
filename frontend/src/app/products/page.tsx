"use client";

export default function ProductsPage() {
  return (
    <div className="page-root">
      <header className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Product catalog and commerce</p>
        </div>
      </header>
      <div className="rounded-xl border border-(--card-border) bg-(--card-bg-subtle) p-8 text-center">
        <p className="text-muted font-medium">Products are coming soon.</p>
        <p className="text-sm text-muted-dim mt-2">You can use Campaigns and Subscribers to promote and sell in the meantime.</p>
      </div>
    </div>
  );
}
