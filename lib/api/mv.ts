import { cacheLife, cacheTag } from "next/cache";
import { type ApiMvItem, type Mv, toMv } from "./types";

// Same fixed-catalog caching as albums.ts: 'max' profile + a tag for a one-shot
// revalidateTag('mv') when videos are added server-side. Payload carries both
// weights per video: streamSize (webm playback) and fileSize (mp4 download).

const API = process.env.NEXT_PUBLIC_API_URL;

/** All music videos, for the MV grid. */
export async function getMvs(): Promise<Mv[]> {
  "use cache";
  cacheLife("max");
  cacheTag("mv");

  const res = await fetch(`${API}/mv/list`);
  if (!res.ok) {
    throw new Error(`Failed to load MVs: ${res.status} ${res.statusText}`);
  }
  const { items } = (await res.json()) as { items: ApiMvItem[] };
  return items.map(toMv);
}
