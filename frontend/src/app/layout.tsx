import type { Metadata } from "next";
import { Nav } from "./Nav";
import { Preloader } from "./Preloader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Klarnow mailing tool",
  description: "Email automation with Resend (MailerLite-style MVP)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Preloader />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=localStorage.getItem("sidebar-collapsed");document.body.dataset.sidebarCollapsed=s==="true"?"true":"false";var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}`,
          }}
        />
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Nav />
        <main
          id="main-content"
          className="main-with-sidebar main-content-premium relative z-10 min-h-screen px-4 sm:px-6 py-8 sm:py-10"
          tabIndex={-1}
        >
          <div className="mx-auto max-w-7xl relative">{children}</div>
        </main>
      </body>
    </html>
  );
}
