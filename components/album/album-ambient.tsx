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
      className={cn("fixed inset-0 -z-10 overflow-hidden", className)}
    >
      {/* Decorative and heavily blurred — no priority preload (the crisp
          hero cover deserves that), but eager: it fills the viewport, so
          the browser flags it as LCP and lazy-loading it only delays it.
          A small variant suffices: under blur-xl anything past a few hundred
          pixels is invisible, and the saved bandwidth goes to real content. */}
      <div className="absolute -inset-[12%] animate-breathe">
        <FadeImage
          src={cover}
          eager
          sizes="384px"
          className="blur-xl saturate-[1.35]"
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
