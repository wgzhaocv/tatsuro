// Catalog revision — a cache-busting stamp on the two catalog-wide list
// endpoints (/music/releases, /music/search-index). The backend fronts every
// route with the Workers-native edge cache (`"cache": { "enabled": true }` in
// yamashita-api/wrangler.jsonc) and serves these two with
// `Cache-Control: immutable, s-maxage=30d`. That Workers cache is NOT cleared by
// a zone purge — a successful `purge_everything` (2026-07) left the stale copy
// in place — so the only reliable way to surface a catalog change is to change
// the URL's cache key. Bumping this mints a fresh key → edge MISS → the Worker
// returns the current catalog.
//
// The one knob to turn after an ingest (see discography/imports/): update D1,
// bump CATALOG_REV, redeploy the frontend. Old revs' objects age out on their
// own. By-id endpoints (/music/release/:id, /music/album_songs/:id) need no rev —
// a new id is already a fresh key.
export const CATALOG_REV = "2026-07-16-otsc3";
