"use client";

import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { cn } from "@/lib/utils";

/**
 * Client body for the album 404. `not-found.tsx` can't receive params/locale,
 * so the translated copy lives here — the NextIntlClientProvider mounted in
 * app/[locale]/layout.tsx is an ancestor, so this reads messages fine.
 */
export function AlbumNotFoundContent() {
  const t = useTranslations("album");
  return (
    <>
      <h1 className="font-display text-3xl font-medium text-foreground">
        {t("notFoundTitle")}
      </h1>
      <p className="max-w-sm text-muted-foreground">{t("notFoundBody")}</p>
      <Link
        href="/"
        className={cn(buttonVariants({ variant: "default" }), "mt-2 h-11 px-6")}
      >
        {t("notFoundBack")}
      </Link>
    </>
  );
}
