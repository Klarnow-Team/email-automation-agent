"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SubscribersHistoryPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/subscribers?view=history");
  }, [router]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="spinner" />
      <span className="ml-3 text-sm text-muted-dim">Redirecting…</span>
    </div>
  );
}
