"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";

/**
 * Copy / native-share a deep link. Callers pass a resolver that returns a
 * locale-less path already carrying a minted `?argot=` token (or null when it
 * can't be built); this prepends origin + locale, then uses the native share
 * sheet on touch devices and the clipboard on desktop.
 *
 * The link is minted server-side (a token round-trip), so the surface shows the
 * work inline: `pending` drives a spinner on the button/menu-item itself (no
 * global toast). `share` resolves to `true` when the caller should dismiss
 * (success or the user closing the native sheet) and `false` on failure, so an
 * overflow menu can stay open to signal something went wrong. The one place the
 * song and album-edition share surfaces share.
 */
export function useShareLink(): {
  share: (
    resolve: () => Promise<string | null>,
    title: string,
  ) => Promise<boolean>;
  pending: boolean;
} {
  const t = useTranslations("share");
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  const share = useCallback(
    async (resolve: () => Promise<string | null>, title: string) => {
      setPending(true);
      try {
        const link = await resolve();
        if (!link) {
          toast.error(t("failed"));
          return false;
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
        }
        return true;
      } catch (err) {
        // User dismissed the native share sheet — not an error, let it close.
        if (err instanceof DOMException && err.name === "AbortError")
          return true;
        toast.error(t("failed"));
        return false;
      } finally {
        setPending(false);
      }
    },
    [locale, t],
  );
  return { share, pending };
}
