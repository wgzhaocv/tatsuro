"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";

/**
 * Syncs `<html lang>` to the active UI locale. The root <html> lives in the
 * shared root layout (above [locale]) and ships `lang="en"`; this effect
 * corrects it after hydration. The root already has suppressHydrationWarning
 * (for next-themes), so mutating the attribute produces no mismatch warning.
 * Japanese *content* fonts are driven by per-node lang="ja", independent of this.
 */
export function HtmlLang() {
  const locale = useLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
