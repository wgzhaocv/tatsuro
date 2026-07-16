import { cacheLife, cacheTag } from "next/cache";
import { ImageResponse } from "next/og";
import type { AlbumCategory } from "@/lib/api/types";
import { coverUrl } from "@/lib/api/urls";

// Shared builders for the site's OpenGraph cards — the previews that unfurl when
// a link is pasted into Slack / WhatsApp / iMessage / X. Colours are the app's
// own (app/globals.css): sea-glass noon ground for the brand card, and — for a
// release — its cover blurred to fill the frame as ambient light dissolving into
// a sea-glass veil, the same treatment as the album detail screen. The gate card
// sits on the dusk ground so it reads instantly as private.
//
// Text is Latin-only on purpose: satori's built-in font has no CJK glyphs, and
// bundling one would add megabytes. Japanese release titles are carried
// visually by the cover art on the album card, so nothing renders as tofu.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/** A rendered release card as a base64 PNG. Both the cover fetch AND satori's
 *  render happen inside this cached boundary, and its output is plain bytes — so
 *  the OG route that returns them has no uncached IO of its own and can be
 *  statically prerendered for the whole (fixed) discography. Without this, the
 *  route exposes ImageResponse's internal uncached fetch at the top level, which
 *  Cache Components rejects mid-prerender → the route 500s on every unfurl.
 *  cacheTag keys on the cover so revalidateTag('albums') refreshes cards too. */
export async function albumOgPng(input: {
  coverId: string;
  name: string;
  year?: number;
  category?: AlbumCategory;
}): Promise<string> {
  "use cache";
  cacheLife("max");
  cacheTag("albums", `cover:${input.coverId}`);
  const res = await fetch(coverUrl(input.coverId));
  if (!res.ok) throw new Error(`cover ${input.coverId}: HTTP ${res.status}`);
  const type = res.headers.get("content-type") ?? "image/jpeg";
  const cover = `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  const png = await albumOgImage({
    cover,
    name: input.name,
    year: input.year,
    category: input.category,
  }).arrayBuffer();
  return Buffer.from(png).toString("base64");
}

/** The brand card as cached base64 PNG — same reason as albumOgPng: keeps the
 *  fallback path free of uncached IO so the OG routes stay statically
 *  prerenderable (an unknown-id request at runtime still lands here). */
export async function brandOgPng(): Promise<string> {
  "use cache";
  cacheLife("max");
  return Buffer.from(await brandOgImage().arrayBuffer()).toString("base64");
}

/** Wrap cached PNG bytes (albumOgPng / brandOgPng) in a Response for an OG
 *  route to return. */
export function pngResponse(base64: string): Response {
  return new Response(Buffer.from(base64, "base64"), {
    headers: { "Content-Type": OG_CONTENT_TYPE },
  });
}

// Palette (mirrors app/globals.css — DESIGN.md is canonical).
const SKY = "#BFE9F2"; // --secondary (pale sky) — solid brand ground
const CREAM = "#FFF6E9"; // --shell, used as ink on the dusk gate card
const NAVY = "#0B3A53"; // --foreground
const DUSK = "#12263A"; // --color-dusk-navy
const INK_MIST = "#4C7083"; // --muted-foreground
const OCEAN_DEEP = "#0C8097"; // --primary
const CORAL = "#FF8A5B";
// Veil over the blurred cover: transparent at the cover side so the ambient
// shows, ramping to a SOLID pale-sky panel from mid-frame on — so the metadata
// always sits on a light ground and navy ink stays legible over any cover
// (dark ones like For You included). Same idea as the album screen dissolving
// its cover into noon light.
const COVER_VEIL = "linear-gradient(90deg, rgba(231,244,250,0), #E7F4FA 46%)";

const CATEGORY_LABEL: Record<AlbumCategory, string> = {
  studio: "Studio Album",
  live: "Live",
  compilation: "Compilation",
  single: "Single",
};

/** No character outside Basic/Extended Latin, general punctuation, or currency
 *  (i.e. nothing satori's built-in font can't draw — kana/kanji fail this). */
function isLatin(s: string): boolean {
  return !/[^ -˿ -⁯₠-⃏]/.test(s);
}

/** Headline point size: a step-down for longer Latin titles; a fixed size for
 *  the non-Latin fallback (which shows the year, never the title). */
function headlineSize(latin: boolean, name: string): number {
  if (!latin) return 76;
  if (name.length > 18) return 46;
  if (name.length > 12) return 56;
  return 68;
}

/** Site-wide default card: wordmark + tagline on the sea-glass noon ground. */
export function brandOgImage(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: SKY,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 72,
          fontWeight: 600,
          letterSpacing: 16,
          color: NAVY,
        }}
      >
        TATSURO YAMASHITA
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 26,
          letterSpacing: 10,
          color: INK_MIST,
          marginTop: 28,
        }}
      >
        THE COMPLETE DISCOGRAPHY
      </div>
    </div>,
    { ...OG_SIZE },
  );
}

/** The "password required" card shown when a tokenless link is unfurled — a
 *  dusk-navy ground so it reads instantly as private / after-hours. */
export function gateOgImage(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: DUSK,
      }}
    >
      {/* padlock */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginBottom: 46,
        }}
      >
        <div
          style={{
            width: 60,
            height: 50,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            borderStyle: "solid",
            borderColor: CREAM,
            borderTopWidth: 12,
            borderLeftWidth: 12,
            borderRightWidth: 12,
            borderBottomWidth: 0,
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 104,
            height: 84,
            borderRadius: 18,
            background: CREAM,
            marginTop: -4,
          }}
        >
          <div
            style={{ width: 14, height: 30, borderRadius: 7, background: DUSK }}
          />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 60,
          fontWeight: 600,
          letterSpacing: 12,
          color: CREAM,
        }}
      >
        TATSURO YAMASHITA
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 24,
          letterSpacing: 9,
          color: CORAL,
          marginTop: 24,
        }}
      >
        PASSWORD PROTECTED
      </div>
    </div>,
    { ...OG_SIZE },
  );
}

/** Shared release/track card: the cover blurred to fill the frame as ambient
 *  light, the crisp cover beside a kicker + headline + sub-line. */
function coverCard({
  cover,
  headline,
  sub,
  fontSize,
  tightLetter,
}: {
  cover: string;
  headline: string;
  sub: string;
  fontSize: number;
  /** Latin headline → no extra tracking; a fallback word → slight tracking. */
  tightLetter: boolean;
}): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: SKY,
      }}
    >
      {/* ambient: the cover blown up + blurred to fill the frame */}
      {/* biome-ignore lint/performance/noImgElement: satori renders raw <img> */}
      <img
        src={cover}
        width={1400}
        height={1400}
        alt=""
        style={{
          position: "absolute",
          top: -385,
          left: -100,
          width: 1400,
          height: 1400,
          objectFit: "cover",
          filter: "blur(44px)",
          transform: "scale(1.1)",
        }}
      />
      {/* sky veil: dissolves the ambient into the app's noon ground. Explicit
          box (satori doesn't expand the `inset` shorthand → a zero-size veil). */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: COVER_VEIL,
        }}
      />

      {/* foreground: crisp cover + metadata */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          width: "100%",
          height: "100%",
          padding: "0 84px",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 452,
            height: 452,
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: "0 26px 50px -24px rgba(11,58,83,0.65)",
          }}
        >
          {/* biome-ignore lint/performance/noImgElement: satori renders raw <img> */}
          <img
            src={cover}
            width={452}
            height={452}
            style={{ objectFit: "cover" }}
            alt=""
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 76,
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 24,
              letterSpacing: 8,
              color: INK_MIST,
            }}
          >
            TATSURO YAMASHITA
          </div>
          <div
            style={{
              display: "flex",
              fontSize,
              fontWeight: 600,
              lineHeight: 1.08,
              letterSpacing: tightLetter ? 0 : 4,
              color: NAVY,
              marginTop: 18,
            }}
          >
            {headline}
          </div>
          {sub ? (
            <div
              style={{
                display: "flex",
                fontSize: 30,
                letterSpacing: 4,
                color: OCEAN_DEEP,
                marginTop: 22,
              }}
            >
              {sub}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    { ...OG_SIZE },
  );
}

/** Per-release card: cover ambient + release name / year / category (Latin — the
 *  cover carries any Japanese title). Falls back to the brand card when data is
 *  missing (unknown id at request time). */
export function albumOgImage({
  cover,
  name,
  year,
  category,
}: {
  cover: string;
  name: string;
  year?: number;
  category?: AlbumCategory;
}): ImageResponse {
  const latin = isLatin(name);
  const catLabel = category ? CATEGORY_LABEL[category] : "";
  const meta = [year, catLabel].filter(Boolean).join("   ·   ");
  return coverCard({
    cover,
    headline: latin ? name : year ? String(year) : "ALBUM",
    sub: latin ? meta : catLabel,
    fontSize: headlineSize(latin, name),
    tightLetter: latin,
  });
}
