"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const done = searchParams.get("done") === "1";

  return (
    <div className="page-root">
      <div className="section-card max-w-lg mx-auto text-center">
        {done ? (
          <>
            <h1 className="page-title text-2xl mb-2">You’re unsubscribed</h1>
            <p className="text-muted mb-6">
              You won’t receive further campaign emails from this list. If you change your mind, you can sign up again.
            </p>
            <Link href="/" className="btn-primary">
              Back to home
            </Link>
          </>
        ) : (
          <>
            <h1 className="page-title text-2xl mb-2">Unsubscribe</h1>
            <p className="text-muted">
              Use the unsubscribe link in one of our emails to stop receiving campaigns. If you arrived here by mistake, <Link href="/" className="text-(--accent) hover:underline">go back to the app</Link>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="page-root">
          <div className="section-card max-w-lg mx-auto text-center">
            <div className="animate-pulse h-8 bg-muted/30 rounded w-48 mx-auto mb-4" />
            <div className="animate-pulse h-4 bg-muted/20 rounded w-full" />
          </div>
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
