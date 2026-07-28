import { House } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { GlassPanel } from "@/components/glass-panel";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { cn } from "@/lib/utils";

/**
 * What a dead share link opens: revoked, or pointing at a playlist its owner
 * deleted. A card with a way onward rather than notFound() — the visitor did
 * nothing wrong, and the site's own 404 would read as a broken app. Frosted over
 * the section's beach hero, so it needs no artwork of its own.
 */
export async function ShareUnavailable() {
  const t = await getTranslations("share");
  return (
    <div className="relative z-10 flex min-h-dvh items-center justify-center px-5 py-20">
      <GlassPanel className="w-full max-w-md rounded-[28px] px-6 py-14 text-center shadow-postcard">
        {/* The card is this page's whole content, so its line is the document's
            h1 (globals.css gives h1–h3 the display face). */}
        <h1 className="text-lg font-medium text-foreground">
          {t("unavailableTitle")}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {t("unavailableBody")}
        </p>
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "action" }),
            "mt-7 h-11 rounded-full pr-5 pl-4",
          )}
        >
          <House size={18} weight="bold" aria-hidden />
          {t("goHome")}
        </Link>
      </GlassPanel>
    </div>
  );
}
