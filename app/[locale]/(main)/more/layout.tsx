import { SectionHero } from "@/components/section-hero";
import beachDusk from "../_assets/home-dusk.jpg";
import beachNoon from "../_assets/home-noon.jpg";

/**
 * Shared surface for the More screen: the same fixed beach hero + PageScroll as
 * the album / MV / playlists browse screens, so the section reads as one of the
 * four tabs. The page renders its glass panels over it.
 */
export default function MoreLayout({
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
