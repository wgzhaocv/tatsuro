import { renderTile } from "../tile";

// Served at /icons/maskable-192.png. The .png suffix is load-bearing: proxy.ts's
// matcher excludes static image extensions from the gate, so the icon resolves
// for the browser's manifest fetch without an auth redirect. Caching is set on
// the response (see tile.tsx) — cacheComponents disallows route-level `dynamic`.
export function GET() {
  return renderTile(192);
}
