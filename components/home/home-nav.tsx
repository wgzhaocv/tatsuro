import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { AccountButton } from "@/components/account/account-button";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "@/components/ui/link";

// Sections with an href have a live screen; the rest are drawn as placeholders
// (their screens land in a later phase) — shown, but never a dead click.
// `key` indexes the `nav` messages and identifies the active section.
const SECTIONS: {
  key: "albums" | "mv" | "playlists" | "more";
  href?: string;
}[] = [
  { key: "albums", href: "/" },
  { key: "mv", href: "/mv" },
  { key: "playlists", href: "/playlists" },
  { key: "more", href: "/more" },
];

/** The browse-screen top bar, floating over the hero photo. */
export function HomeNav({
  current,
  search,
}: {
  /** Key of the active section (matches SECTIONS). */
  current: "albums" | "mv" | "playlists" | "more";
  /** Search affordance for the right rail (the command-palette trigger). */
  search?: ReactNode;
}) {
  const t = useTranslations("nav");
  // items-start so a wrapping control group grows downward without dragging the
  // logo down with it. The logo carries a control-height box (min-h-11) and
  // centres inside it, so it lands on the first row's centre — and stays there
  // no matter how many rows the controls fold into.
  return (
    <header className="relative flex items-start gap-3 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8 sm:pb-5 sm:pt-[max(1.25rem,env(safe-area-inset-top))]">
      <Link
        href="/"
        className="flex min-h-11 shrink-0 items-center rounded-full text-white [text-shadow:0_2px_12px_rgba(11,58,83,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        {/* Wordmark: brand font (Jost) + wide tracking — the LV/Futura formula
            (DESIGN.md § Navigation). */}
        <span className="font-brand font-medium text-xl tracking-[0.3em]">
          TATSURO
        </span>
      </Link>

      {/* Absolutely centered on the viewport — the side rails (logo / controls)
          vary in width, so a flex-between would drift the pills off-center. */}
      <nav
        aria-label={t("sections")}
        className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 hidden lg:block"
      >
        <div className="flex gap-1 rounded-full border border-white/40 bg-white/15 p-1 backdrop-blur-xs dark:bg-dusk-navy/40">
          {SECTIONS.map((s) => {
            // No href → a placeholder for a not-yet-built screen (never a dead click).
            if (!s.href)
              return (
                <span
                  key={s.key}
                  aria-disabled="true"
                  title={t("comingSoon")}
                  className="cursor-not-allowed rounded-full px-5 py-2 text-sm font-medium text-white/85 [text-shadow:0_1px_5px_rgba(11,58,83,0.5)]"
                >
                  {t(s.key)}
                </span>
              );
            const isCurrent = s.key === current;
            return (
              <Link
                key={s.key}
                href={s.href}
                aria-current={isCurrent ? "page" : undefined}
                className={
                  isCurrent
                    ? "rounded-full bg-white px-5 py-2 text-sm font-semibold text-navy"
                    : "rounded-full px-5 py-2 text-sm font-medium text-white/85 transition-colors duration-500 ease-lazy [text-shadow:0_1px_5px_rgba(11,58,83,0.5)] hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                }
              >
                {t(s.key)}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Controls fill the space right of the logo and stay right-aligned
          (grow + justify-end). When they can't fit they wrap within that right
          area (flex-wrap) — folded controls stay on the right, never jumping to
          the screen's left edge. min-w-0 lets the group shrink so the wrap
          actually triggers instead of overflowing off-screen. Search is the
          one sent to a second row when space runs out (order-last below lg) —
          it keeps its usual left-most spot on the desktop rail (lg:order-none),
          but on phones the three icon buttons stay up on the logo's row and
          search folds beneath them, rather than the theme toggle dropping. */}
      <div className="flex min-w-0 grow flex-wrap items-center justify-end gap-3">
        <div className="order-last lg:order-none">{search}</div>
        <AccountButton />
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
