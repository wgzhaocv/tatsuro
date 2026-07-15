"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "sonner";

/**
 * Copy / native-share a deep link. Callers pass a resolver that returns a
 * locale-less path already carrying a minted `?argot=` token (or null when it
 * can't be built); this prepends origin + locale, then uses the native share
 * sheet on touch devices and the clipboard on desktop, toasting the outcome.
 * The one place the song and album-edition share surfaces share.
 */
export function useShareLink(): (
  resolve: () => Promise<string | null>,
  title: string,
) => Promise<void> {
  const t = useTranslations("share");
  const locale = useLocale();
  return useCallback(
    async (resolve, title) => {
      try {
        const link = await resolve();
        if (!link) {
          toast.error(t("failed"));
          return;
        }
        const url = `${window.location.origin}/${locale}${link}`;
        // Native share sheet on touch devices; clipboard on desktop.
        if (
          typeof navigator.share === "function" &&
          navigator.maxTouchPoints > 0
        ) {
          await navigator.share({ title, url });
        } else {
          await navigator.clipboard.writeText(url);
          toast.success(t("copied"));
        }
      } catch (err) {
        // User dismissed the native share sheet — not an error.
        if (err instanceof DOMException && err.name === "AbortError") return;
        toast.error(t("failed"));
      }
    },
    [locale, t],
  );
}
