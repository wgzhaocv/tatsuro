import { SectionHero } from "@/components/section-hero";
import beachDusk from "../_assets/home-dusk.jpg";
import beachNoon from "../_assets/home-noon.jpg";

/**
 * Shared surface for the shared-playlist viewer: the same fixed beach hero + one
 * PageScroll (via SectionHero) the playlists section uses, so a link opened cold
 * lands somewhere that looks like the rest of the app rather than a bare page.
 *
 * The hero belongs here rather than in the page because the page's read is
 * uncached: keeping it in the layout leaves this shell static, outside the page's
 * Suspense boundary, so a cold link paints the beach before the fetch resolves.
 */
export default function ShareLayout({
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
