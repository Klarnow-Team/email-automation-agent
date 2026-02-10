import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Email Auto Agent",
  description: "Email automation with Resend (MailerLite-style MVP)",
};

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/subscribers", label: "Subscribers" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/automations", label: "Automations" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <nav className="glass-strong fixed left-0 right-0 top-0 z-50 mx-4 mt-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center gap-8">
            <Link
              href="/"
              className="text-lg font-semibold tracking-tight text-white"
            >
              Email Auto Agent
            </Link>
            <div className="flex items-center gap-1">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
        <main className="relative z-10 mx-auto max-w-6xl px-4 pt-24 pb-12">
          {children}
        </main>
      </body>
    </html>
  );
}
