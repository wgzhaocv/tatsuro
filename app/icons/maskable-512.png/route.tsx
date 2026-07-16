import { renderTile } from "../tile";

// Served at /icons/maskable-512.png. See maskable-192.png/route.tsx for why the
// .png suffix matters (gate exclusion) and where caching is set.
export function GET() {
  return renderTile(512);
}
