import type { Metadata } from "next";
import {
  Geist_Mono,
  Inter,
  Quicksand,
  Zen_Maru_Gothic,
} from "next/font/google";
import "./globals.css";
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

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
      className={cn(
        "h-full antialiased font-sans",
        quicksand.variable,
        inter.variable,
        zenMaruGothic.variable,
        geistMono.variable,
      )}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
