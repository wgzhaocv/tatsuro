"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

// Compact self-labels for the trigger — locale identity, not translated copy.
const SHORT: Record<string, string> = { en: "EN", ja: "日", zh: "中" };

/**
 * Locale switch in the nav beside the theme toggle. A single frosted chip (same
 * material as ThemeToggle) showing the current locale's short code; the dropdown
 * lists the three with their native names. Selecting swaps locale in place —
 * next-intl's router persists the choice (NEXT_LOCALE cookie), and usePathname
 * here is already locale-stripped, so it's passed straight through.
 */
export function LanguageSwitcher() {
  const t = useTranslations("switcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Select
      value={locale}
      onValueChange={(next) =>
        router.replace(pathname, { locale: next ?? locale })
      }
    >
      <SelectTrigger
        aria-label={t("label")}
        className="gap-1 rounded-full border-white/60 bg-card/80 px-4 font-medium text-foreground shadow-lift-navy backdrop-blur-xs dark:border-white/15"
      >
        <SelectValue>{SHORT[locale]}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {routing.locales.map((loc) => (
          <SelectItem key={loc} value={loc}>
            {t(loc)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
