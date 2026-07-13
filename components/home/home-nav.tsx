import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "@/components/ui/link";

// Sections with an href have a live screen; the rest are drawn as placeholders
// (their screens land in a later phase) — shown, but never a dead click.
// `key` indexes the `nav` messages and identifies the active section.
const SECTIONS: {
  key: "albums" | "discover" | "mv" | "playlists";
  href?: string;
}[] = [
  { key: "albums", href: "/" },
  { key: "discover" },
  { key: "mv", href: "/mv" },
  { key: "playlists" },
];

/** The browse-screen top bar, floating over the hero photo. */
export function HomeNav({
  current,
  search,
}: {
  /** Key of the active section (matches SECTIONS). */
  current: "albums" | "mv";
  /** Search affordance for the right rail (the command-palette trigger). */
  search?: ReactNode;
}) {
  const t = useTranslations("nav");
  return (
    <header className="relative flex items-center justify-between gap-3 px-5 py-4 sm:px-8 sm:py-5">
      <Link
        href="/"
        className="flex items-center gap-2 rounded-full text-white [text-shadow:0_2px_12px_rgba(11,58,83,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 15c3-3 5-3 8 0s5 3 8 0" />
          <path d="M2 9c3-3 5-3 8 0" />
        </svg>
        <span className="font-display text-xl font-semibold tracking-[0.08em]">
          TATSURO
        </span>
      </Link>

      {/* Absolutely centered on the viewport — the side rails (logo / controls)
          vary in width, so a flex-between would drift the pills off-center. */}
      <nav
        aria-label={t("sections")}
        className="-translate-x-1/2 absolute left-1/2 hidden lg:block"
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

      <div className="flex items-center gap-3">
        {search}
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
