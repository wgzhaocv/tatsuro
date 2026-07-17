import { getImageProps, type StaticImageData } from "next/image";
import { ThemeImageOverride } from "@/components/theme-image-override";
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
 * The initial DOWNLOAD follows prefers-color-scheme (the OS), not the in-app
 * theme toggle, so the LCP paint costs zero JS. ThemeImageOverride then closes
 * the gap on the client: if the viewer toggles against their OS it paints the
 * theme-correct photo on top — a no-op (and no extra fetch) on the common
 * app==OS path, so the toggle moves the backdrop without touching LCP.
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
      {/* Follow the in-app theme toggle when it diverges from the OS (the
          <picture> above can only track prefers-color-scheme). No-op — and no
          extra download — on the common app==OS path, so LCP is untouched. */}
      <ThemeImageOverride
        noon={noon}
        dusk={dusk}
        sizes={sizes}
        className={className}
      />
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
