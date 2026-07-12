import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shared chrome for every album route (default edition and /:id/:year alike):
 * the back-to-albums pill and the theme toggle. Each edition page below brings
 * its own ambient wash, rail, and tracklist.
 */
export default function AlbumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-4 sm:px-8 sm:py-5">
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "glass-ink" }),
            "h-11 rounded-full pr-4 pl-3",
          )}
        >
          <ArrowLeft size={18} weight="bold" aria-hidden />
          Albums
        </Link>
        <ThemeToggle />
      </header>
      {children}
    </div>
  );
}
