import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { cn } from "@/lib/utils";

/**
 * Shared chrome for every album route (default edition and /:id/:year alike):
 * the back-to-albums pill and the theme toggle. Each edition page below brings
 * its own ambient wash, rail, and tracklist.
 */
export default async function AlbumLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "album" });
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8 sm:pb-5 sm:pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "glass-ink" }),
            "h-11 rounded-full pr-4 pl-3",
          )}
        >
          <ArrowLeft size={18} weight="bold" aria-hidden />
          {t("back")}
        </Link>
        <ThemeToggle />
      </header>
      {children}
    </div>
  );
}
