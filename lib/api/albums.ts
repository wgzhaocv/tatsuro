import { cacheLife, cacheTag } from "next/cache";
import { type Album, type ApiAlbum, toAlbum } from "./types";

// The content is a fixed, complete discography, so everything here is cached with the
// 'max' profile and tagged for one-shot invalidation via revalidateTag('albums').
// See lib/api/README intent: fetch is centralized — never call the backend from a
// component.

const API = process.env.NEXT_PUBLIC_API_URL;

// Tatsuro's canonical album ordering (ported from the old site — valuable domain data,
// not a UI concern). Albums whose id appears here render in this order; any album the
// backend adds beyond this list is appended afterwards in API order rather than dropped.
const CURATED_ORDER = [
  "7152117059796992", // For You
  "7153706728976384", // Ride on Time
  "7152104592375808", // Greatest Hits! Of Tatsuro Yamashita
  "7153708752195584", // Melodies
  "7153695604793344", // Spacy
  "7153714950184960", // Cozy
  "7153714251001856", // Treasures
  "7153709340991488", // Big Wave
  "7153704922038272", // Moonglow
  "7153710643888128", // Pocket Music
  "7153699017359360", // Come Along
  "7153709906612224", // Come Along II
  "7153711322980352", // Boku no Naka no Shounen
  "7153706145652736", // On the Street Corner
  "7153710321451008", // On the Street Corner 2
  "7153696694857728", // Go Ahead!
  "7153694478798848", // Circus Town
  "7153721897775104", // Opus- All Time Best 1975-2012 - CD1
  "7153722325184512", // Opus- All Time Best 1975-2012 - CD2
  "7153722772979712", // Opus- All Time Best 1975-2012 - CD3
  "7153712289234944", // Joy- Tatsuro Yamashita Live - CD1
  "7153712898863104", // Joy- Tatsuro Yamashita Live - CD2
  "7153720636329984", // Rarities - CD1
  "7153721089486848", // Rarities - CD2
  "7153723398295552", // Softly - CD1
  "7153723842711552", // Softly - CD2 - The Latest Acoustic Live
  "7153725094756352", // It's a Poppin' Time - CD1
  "7153725384036352", // It's a Poppin' Time - CD2
  "7153713783689216", // Season's Greetings
];

function byCuratedOrder(albums: Album[]): Album[] {
  const rank = new Map(CURATED_ORDER.map((id, i) => [id, i]));
  const fallback = CURATED_ORDER.length;
  return [...albums].sort(
    (a, b) => (rank.get(a.id) ?? fallback) - (rank.get(b.id) ?? fallback),
  );
}

/** The full album list, in Tatsuro's canonical order. */
export async function getAlbums(): Promise<Album[]> {
  "use cache";
  cacheLife("max");
  cacheTag("albums");

  const res = await fetch(`${API}/music/albums`);
  if (!res.ok) {
    throw new Error(`Failed to load albums: ${res.status} ${res.statusText}`);
  }
  const { albums } = (await res.json()) as { albums: ApiAlbum[] };
  return byCuratedOrder(albums.map(toAlbum));
}

/** A single album's metadata. */
export async function getAlbum(albumId: string): Promise<Album> {
  "use cache";
  cacheLife("max");
  cacheTag("albums", `album:${albumId}`);

  const res = await fetch(`${API}/music/album/${albumId}`);
  if (!res.ok) {
    throw new Error(
      `Failed to load album ${albumId}: ${res.status} ${res.statusText}`,
    );
  }
  return toAlbum((await res.json()) as ApiAlbum);
}
