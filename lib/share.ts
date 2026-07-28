"use server";

import { findReleaseByDisc } from "@/lib/api/albums";
import { editionSlug, nameLang } from "@/lib/api/types";
import { signToken } from "@/lib/auth";
import { AUTH_COOKIE_NAME } from "@/lib/constants";

/**
 * Resolve a song's source-album (disc) id to its release path. The wire song only
 * knows its disc id (which equals the release id only for single-disc releases),
 * so this maps it back to the logical release + edition. The i18n router adds the
 * locale prefix, so the returned path is locale-less. Null when unresolvable.
 * Used by the "view album" row action.
 */
export async function getAlbumHref(
  discId: string,
  locale: string,
): Promise<string | null> {
  const found = await findReleaseByDisc(discId, nameLang(locale));
  if (!found) return null;
  const base = `/album/${found.album.id}`;
  return found.edition.id === found.album.defaultEditionId
    ? base
    : `${base}/${editionSlug(found.edition)}`;
}

/**
 * Build a shareable deep link to a song: the release page with `?song=` (the
 * album screen highlights + scrolls to it, old-site style) plus a freshly minted
 * auth token (`?argot=…`) so the recipient — and link-preview bots — open
 * straight in without the gate. The live token is an httpOnly cookie JS can't
 * read, hence minting it here. Locale-less path; the caller prepends the origin +
 * locale. Null when the song's release can't be resolved.
 */
export async function getSongShareLink(
  discId: string,
  songId: string,
  locale: string,
): Promise<string | null> {
  const href = await getAlbumHref(discId, locale);
  if (!href) return null;
  const token = await signToken();
  return `${href}?song=${songId}&${AUTH_COOKIE_NAME}=${token}`;
}

/**
 * Build a shareable deep link to an album edition: its release route (the
 * default edition at /album/:id, reissues at /album/:id/:slug — see
 * EditionSwitch) plus a freshly minted auth token (`?argot=…`) so the recipient
 * — and link-preview bots — open straight in without the gate. `slug` is null
 * for the default edition. Locale-less path; the caller prepends origin + locale.
 */
export async function getEditionShareLink(
  albumId: string,
  slug: string | null,
): Promise<string> {
  const token = await signToken();
  const base = `/album/${albumId}`;
  const href = slug ? `${base}/${slug}` : base;
  return `${href}?${AUTH_COOKIE_NAME}=${token}`;
}

/**
 * Build the shareable link for a playlist share slug: the public /share/:slug
 * viewer, gate ticket attached.
 *
 * Why an action for two lines of string work: the slug is minted client-side (the
 * backend bearer token lives in localStorage, which only the browser can read),
 * while the gate ticket can only be signed on the server — so this does exactly
 * the part the client can't. See createPlaylistShareLink for the other half.
 */
export async function getPlaylistShareLink(slug: string): Promise<string> {
  const token = await signToken();
  return `/share/${slug}?${AUTH_COOKIE_NAME}=${token}`;
}
