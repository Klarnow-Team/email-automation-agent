import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { Preloader } from "./Preloader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Klarnow mailing tool",
  description: "Email automation with Resend (MailerLite-style MVP)",
  icons: {
    icon: "/favicon.svg",
  },
};

const themeScript = `try{var s=localStorage.getItem("sidebar-collapsed");document.body.dataset.sidebarCollapsed=s==="true"?"true":"false";var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <Preloader />
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
