import { FadeImage } from "./fade-image";

/**
 * The album screen's environment: the cover blurred huge fills the viewport,
 * then dissolves into noon light (dusk blue in dark) so the page bathes in the
 * artwork's own colour while text above stays ink-on-light — no heavy scrim
 * (Light Overlay Rule).
 */
export function AlbumAmbient({ cover }: { cover: string }) {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
      {/* Decorative and heavily blurred — no priority preload (the crisp
          hero cover deserves that), but eager: it fills the viewport, so
          the browser flags it as LCP and lazy-loading it only delays it. */}
      <div className="absolute -inset-[12%] animate-breathe">
        <FadeImage
          src={cover}
          eager
          sizes="100vw"
          className="blur-xl saturate-[1.35]"
        />
      </div>
      {/* White (noon) / dusk-navy (dark) dissolve — bright enough for ink
          text up top, settling toward the base gradient at the bottom. */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.84),rgba(255,255,255,0.6)_44%,rgba(233,247,242,0.92))] dark:bg-[linear-gradient(to_bottom,rgba(18,38,58,0.84),rgba(18,38,58,0.64)_44%,rgba(18,38,58,0.92))]" />
    </div>
  );
}
