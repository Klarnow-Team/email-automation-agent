"use client";

import { Nav } from "@/app/Nav";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <div className="main-with-sidebar flex min-h-screen flex-col">
        <TopBar />
        <main
          id="main-content"
          className="main-content-premium relative z-10 flex-1 px-4 py-6 sm:px-6 sm:py-8"
          tabIndex={-1}
        >
          <div className="mx-auto max-w-7xl relative">{children}</div>
        </main>
      </div>
    </>
  );
}
