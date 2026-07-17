// Hand-built 206 Partial Content from a cached full body — shared by the SW
// (serving ranged playback requests from either audio bucket) and usable
// anywhere a cached Response needs slicing. Worker-safe: no env, no DOM.

/**
 * Answer a ranged request by slicing the stored full body. Returns null when
 * the Range header doesn't parse (caller should fall back to the full
 * response). blob.slice is a view, not a copy — the full body is never
 * materialized per range request (they arrive constantly on seeks).
 */
export async function buildRangeResponse(
  full: Response,
  rangeHeader: string,
): Promise<Response | null> {
  const rangeMatch = rangeHeader.match(/bytes=(\d*)-(\d*)/);
  if (!rangeMatch) return null;

  const blob = await full.blob();
  const start = Number.parseInt(rangeMatch[1], 10) || 0;
  const end = Number.parseInt(rangeMatch[2], 10) || blob.size - 1;
  const sliced = blob.slice(start, end + 1);
  return new Response(sliced, {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Range": `bytes ${start}-${end}/${blob.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": sliced.size.toString(),
      "Content-Type": full.headers.get("Content-Type") || "audio/ogg",
    },
  });
}
