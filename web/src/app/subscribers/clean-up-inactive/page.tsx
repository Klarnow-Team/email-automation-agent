"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SubscribersCleanUpInactivePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/subscribers?view=clean-up-inactive");
  }, [router]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="spinner" />
      <span className="ml-3 text-sm text-muted-dim">Redirecting…</span>
    </div>
  );
}
