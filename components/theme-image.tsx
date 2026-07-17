import { getImageProps, type StaticImageData } from "next/image";
import { cn } from "@/lib/utils";

/**
 * The environment photo for the active theme, as a native <picture>: a
 * prefers-color-scheme <source> means the browser downloads ONLY the source
 * matching the OS colour scheme — never both. And because it's a plain <img>
 * server-rendered into the initial HTML (no mount gate, no useTheme), it's
 * discoverable and carries fetchPriority="high", so the full-viewport hero — the
 * LCP element on every browse screen — is no longer trapped behind hydration.
 * getImageProps keeps next/image's responsive srcSet + format negotiation, so
 * phones still get a downscaled variant, not the 2400px original.
 *
 * The DOWNLOAD follows prefers-color-scheme (the OS), not the in-app theme
 * toggle. A viewer who overrides the OS therefore sees the OS-matching photo
 * under the toggled UI — an imperceptible crop/tone difference on a scrimmed
 * decorative backdrop, traded for zero JS and an LCP image in the first HTML.
 *
 * Underneath sit two blurred placeholders painted from each photo's inline
 * blurDataURL (a few hundred base64 bytes, no network): CSS (dark:hidden) shows
 * the theme-correct one from the very first paint, so the loading beat always
 * has a soft photo backdrop instead of a flat fill.
 */
export function ThemeImage({
  noon,
  dusk,
  sizes,
  className,
}: {
  noon: StaticImageData;
  dusk: StaticImageData;
  sizes: string;
  /** object-fit/position etc. Encode per-theme crops with a dark: variant,
   *  e.g. "object-[50%_68%] dark:object-[50%_46%]". */
  className?: string;
}) {
  const common = { alt: "", sizes } as const;
  const { props: dark } = getImageProps({ ...common, src: dusk });
  const { props: light } = getImageProps({ ...common, src: noon });

  return (
    <>
      {/* Instant, network-free blurred backdrop; correct theme picked by CSS
          before any JS runs, so the loading beat is never a flat fill. */}
      <BlurLayer img={noon} className="dark:hidden" />
      <BlurLayer img={dusk} className="hidden dark:block" />
      <picture>
        <source
          media="(prefers-color-scheme: dark)"
          srcSet={dark.srcSet}
          sizes={sizes}
        />
        <img
          {...light}
          alt=""
          // Above-the-fold hero: load eagerly and prioritise so it stays the
          // LCP paint instead of the browser's default lazy/low priority.
          loading="eager"
          fetchPriority="high"
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            className,
          )}
        />
      </picture>
    </>
  );
}

/** Tiny inline blur (blurDataURL) stretched to cover — the placeholder that
 *  shows while the sharp photo loads. No-op if next didn't emit a blur for this
 *  import. */
function BlurLayer({
  img,
  className,
}: {
  img: StaticImageData;
  className?: string;
}) {
  if (!img.blurDataURL) return null;
  return (
    <div
      aria-hidden
      className={cn("absolute inset-0 bg-center bg-cover", className)}
      style={{ backgroundImage: `url(${img.blurDataURL})` }}
    />
  );
}
