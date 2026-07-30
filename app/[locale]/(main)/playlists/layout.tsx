import { getTranslations, setRequestLocale } from "next-intl/server";
import { SectionHero } from "@/components/section-hero";
import { socialMeta } from "@/lib/site";
import beachDusk from "../_assets/home-dusk.jpg";
import beachNoon from "../_assets/home-noon.jpg";

// Metadata for the whole section, list and detail alike — this segment's only
// param is the locale, so unlike the detail page it can read params at build
// (see [id]/page.tsx). Each id inherits the section title.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "metadata" });
  return socialMeta(t("playlists"), t("playlistsDescription"));
}

/**
 * Shared surface for every playlists route (list + detail): the fixed beach
 * hero + one PageScroll owning scroll across the section (via SectionHero).
 * Each page renders its own top bar over this — the list its section nav, the
 * detail a back button.
 */
export default function PlaylistsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SectionHero noon={beachNoon} dusk={beachDusk}>
      {children}
    </SectionHero>
  );
}
