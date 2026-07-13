import { SectionHero } from "@/components/section-hero";
import beachDusk from "../_assets/home-dusk.jpg";
import beachNoon from "../_assets/home-noon.jpg";

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
