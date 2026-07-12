import type { Metadata } from "next";
import { Inter, Quicksand, Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";
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

// Japanese glyphs are served on demand via unicode-range slices
const zenMaruGothic = Zen_Maru_Gothic({
  variable: "--font-zen-maru",
  weight: ["400", "500", "700"],
  preload: false,
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
        zenMaruGothic.variable,
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
        </ThemeProvider>
      </body>
    </html>
  );
}
