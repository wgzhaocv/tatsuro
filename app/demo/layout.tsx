import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design Demo — Tatsuro",
  description: "Living reference for the Noon Postcard design system.",
};

export default function DemoLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
