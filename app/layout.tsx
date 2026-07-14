import type { Metadata } from "next";
import { Inter, Jost, Quicksand } from "next/font/google";
import "./globals.css";
import { AudioEngine } from "@/components/player/audio-engine";
import { QueryProvider } from "@/components/query-provider";
import { ServiceWorkerProvider } from "@/components/sw-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
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
  title: "Tatsuro Yamashita",
  description: "The complete discography of Tatsuro Yamashita.",
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
        </ThemeProvider>
      </body>
    </html>
  );
}
