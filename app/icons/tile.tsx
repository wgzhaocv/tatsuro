import { ImageResponse } from "next/og";

// Shared renderer for the maskable app-icon tiles referenced by manifest.ts.
// A white Futura-style monogram T (flat terminals — matches icon.svg / the Jost
// nav wordmark) on a FILLED dusk-navy ground (#12263A = --color-dusk-navy, the
// .dark background + the manifest window color). Filled, not transparent,
// because Android masks these to a squircle and would clip a bare mark.
//
// The T sits inside the maskable safe zone (the centered 80% that survives any
// mask shape): geometry is expressed as fractions of the tile so 192 and 512
// stay identical. Keep the T reading in sync with icon.svg / apple-icon.tsx
// (DESIGN.md § Favicon).
export function renderTile(size: number): ImageResponse {
  // Slender proportions: thin strokes (~8.5% of the tile) and a tall stem, so
  // the mark reads lean rather than blocky. Top 0.22 → bottom 0.78 keeps it in
  // the maskable safe zone (centered 80%).
  const stroke = size * 0.085;
  const bar = {
    left: size * 0.29,
    top: size * 0.22,
    width: size * 0.42,
    height: stroke,
  };
  const stem = {
    left: size * (0.5 - 0.085 / 2),
    top: size * 0.22,
    width: stroke,
    height: size * 0.56,
  };
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        background: "#12263A",
      }}
    >
      <div style={{ position: "absolute", ...bar, background: "#FFFFFF" }} />
      <div style={{ position: "absolute", ...stem, background: "#FFFFFF" }} />
    </div>,
    {
      width: size,
      height: size,
      // The tile is immutable, but cacheComponents forbids `export const
      // dynamic` on the route, so pin caching to the response instead — the
      // CDN/browser serve it without re-running satori per request.
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    },
  );
}
