import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Inter, Jost, Quicksand } from "next/font/google";
import "./globals.css";
import { AudioEngine } from "@/components/player/audio-engine";
import { QueryProvider } from "@/components/query-provider";
import { ServiceWorkerProvider } from "@/components/sw-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ARTIST } from "@/lib/constants";
import { SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Brand wordmark only (nav / gate) — a Futura-style geometric sans; the
// rounded Quicksand reads friendly, not brand. Never for running text.
const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Absolute base for OG image + canonical URLs. Localhost in dev; set
  // NEXT_PUBLIC_SITE_URL to the real origin at deploy (see lib/site.ts).
  metadataBase: new URL(SITE_URL),
  title: { default: ARTIST, template: `%s — ${ARTIST}` },
  description: "The complete discography of Tatsuro Yamashita.",
  applicationName: ARTIST,
  // Private, gated library — keep it out of search indexes. openGraph/twitter
  // are set per-locale in app/[locale]/layout.tsx (which, being under the only
  // rendered subtree, always overrides root-level values anyway).
  robots: { index: false, follow: false },
};

// viewport-fit=cover is required for env(safe-area-inset-*) to resolve to real
// values on notched iOS — the mini player and tab bar rely on it — and it puts
// Safari on the full-viewport model that keeps fixed bottom chrome better
// behaved as the URL bar shows/hides. width/initialScale repeat Next's defaults
// so exporting viewport doesn't drop them.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full antialiased font-sans",
        quicksand.variable,
        inter.variable,
        jost.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="tatsuro-theme"
        >
          <QueryProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </QueryProvider>
          <ServiceWorkerProvider />
          {/* Above [locale] so a language switch never remounts it — a
              remounted <audio> element would ghost-play alongside its
              replacement (the double-audio bug). */}
          <AudioEngine />
          {/* Vercel free-tier telemetry: page views + Web Vitals. No-ops off
              Vercel, so dev/self-host stay clean. */}
          <Analytics />
          <SpeedInsights />
          {/* Top-center clears the bottom chrome (mobile tab bar + mini
              player); the offset drops it below the page header. mobileOffset
              is separate — sonner uses it under 600px. */}
          <Toaster
            position="top-center"
            offset={{ top: "5rem" }}
            mobileOffset={{ top: "5rem" }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
