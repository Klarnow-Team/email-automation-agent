"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function UnsubscribePage() {
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
