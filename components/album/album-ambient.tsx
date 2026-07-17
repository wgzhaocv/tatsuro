import { cn } from "@/lib/utils";
import { FadeImage } from "./fade-image";

/**
 * The artwork-lit environment: the cover blurred huge fills the viewport.
 * With `dissolve` (album/player screens) it melts into noon light (dusk blue
 * in dark) so ink text stays readable — no heavy scrim (Light Overlay Rule).
 * Without it (the MV watch screen) the artwork keeps its full colour and the
 * over-photo rules apply above: white text with navy shadow, glass chrome.
 *
 * House pattern: this layer is `-z-10`, so mount it inside a screen wrapper
 * with `relative isolate` — its own stacking context keeps the ambient from
 * sinking under any ancestor/sibling background (see album/layout.tsx).
 */
export function AlbumAmbient({
  cover,
  dissolve = true,
  className,
}: {
  cover: string;
  dissolve?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      // Constant 100lvh (not inset-0): Chrome Android resizes the fixed viewport
      // when the URL bar hides on scroll, which would rescale this blurred cover
      // (visible zoom). Fixed height keeps it steady; bg so bottom crop is fine.
      className={cn(
        "fixed inset-x-0 top-0 -z-10 h-[100lvh] overflow-hidden",
        className,
      )}
    >
      {/* Decorative and heavily blurred — no priority preload (the crisp
          hero cover deserves that), but eager: it fills the viewport, so
          the browser flags it as LCP and lazy-loading it only delays it.
          A small variant suffices: under blur-xl anything past a few hundred
          pixels is invisible, and the saved bandwidth goes to real content. */}
      {/* A still layer, deliberately: this used to breathe (12s infinite
          scale/opacity), but an animation nobody can see still keeps the
          compositor awake forever and forces the fixed backdrop-blur chrome
          above to re-blur every frame — phones ran hot over it. The overscan
          inset hides the blur's transparent edge bleed. */}
      <div className="absolute -inset-[12%]">
        {/* blur radius scales with viewport: phones get a lighter blur (a
            full-viewport filtered layer is GPU-memory-heavy, and mobile GPUs
            pay most for a large radius), desktop keeps the deep blur-xl.
            Still large enough to hide the 384px source's upscale. */}
        <FadeImage
          src={cover}
          eager
          sizes="384px"
          className="blur-lg saturate-[1.35] lg:blur-xl"
        />
      </div>
      {/* White (noon) / dusk-navy (dark) dissolve — bright enough for ink
          text up top, settling toward the base gradient at the bottom. */}
      {dissolve && (
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.84),rgba(255,255,255,0.6)_44%,rgba(233,247,242,0.92))] dark:bg-[linear-gradient(to_bottom,rgba(18,38,58,0.84),rgba(18,38,58,0.64)_44%,rgba(18,38,58,0.92))]" />
      )}
    </div>
  );
}
