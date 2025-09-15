import "./globals.css";
import "./ui.css";
import Link from "next/link";
import SwRegister from "./SwRegister";
import PerfHUD from "./PerfHUD";
// import CspDevLogger from "./CspDevLogger";
import CommitHud from "../components/CommitHud";

export const metadata = {
  title: "Resonai - Local-first voice feminization trainer",
  description: "Private, low-latency practice with instant feedback.",
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  themeColor: "#7c5cff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="sr-only">Skip to content</a>
        <header className="site">
          <div className="container">
            <nav className="bar" aria-label="Primary">
              <Link href="/" className="brand" aria-label="Resonai home">Resonai</Link>
              <ul>
                <li><Link href="/listen">Listen</Link></li>
                <li><Link href="/practice">Practice</Link></li>
                <li><Link href="/about">About</Link></li>
              </ul>
              <Link href="/practice" className="button">Start practice</Link>
            </nav>
          </div>
        </header>
        <main id="main" className="container">{children}</main>
        <footer className="site">
          <div className="container">
            © {new Date().getFullYear()} Resonai - Local-first. No cloud audio.
            <Link href="/data" className="ml-12 text-muted">Data & Privacy</Link>
            <span className="ml-12 text-muted text-sm">
              v{process.env.NEXT_PUBLIC_BUILD_ID || "dev"}
            </span>
          </div>
        </footer>
        <div aria-live="polite" aria-atomic="true" id="toasts" />
        <SwRegister />
        {process.env.NODE_ENV !== "production" && <PerfHUD />}
        <CommitHud />
        {/* {process.env.NODE_ENV !== "production" && <CspDevLogger />} */}
      </body>
    </html>
  );
}
