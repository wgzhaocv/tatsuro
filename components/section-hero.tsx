import type { StaticImageData } from "next/image";
import { PageScroll } from "@/components/page-scroll";
import { ThemeImage } from "@/components/theme-image";

/**
 * The immersive browse surface shared by the album grid, MV grid, and
 * playlists: one beach photo fixed behind the viewport with a light navy scrim
 * up top (Light Overlay Rule) so white chrome stays legible, plus the section's
 * PageScroll. Callers pass the per-theme photo and render their foreground as
 * children (which own their own `relative z-10` stacking).
 */
export function SectionHero({
  noon,
  dusk,
  children,
}: {
  noon: StaticImageData;
  dusk: StaticImageData;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <PageScroll />
      {/* Constant large-viewport height (not inset-0): Chrome Android grows the
          fixed viewport when the URL bar retracts on scroll, which would rescale
          this cover photo (visible zoom). Pinning to 100lvh keeps it fixed size —
          the bar-visible state just crops a little off the bottom (fine for a bg). */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[100lvh]"
      >
        <div className="absolute inset-0">
          <ThemeImage
            noon={noon}
            dusk={dusk}
            sizes="100vw"
            className="object-[50%_68%] dark:object-[50%_46%]"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(11,58,83,0.42),rgba(11,58,83,0.14)_26%,rgba(11,58,83,0)_54%)] dark:bg-[linear-gradient(to_bottom,rgba(18,38,58,0.52),rgba(18,38,58,0.2)_26%,rgba(18,38,58,0.04)_54%)]" />
      </div>
      {children}
    </div>
  );
}
