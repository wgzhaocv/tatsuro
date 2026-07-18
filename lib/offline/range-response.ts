// Hand-built 206 Partial Content from a cached full body — shared by the SW
// (serving ranged playback requests from either audio bucket) and usable
// anywhere a cached Response needs slicing. Worker-safe: no env, no DOM.

/**
 * Answer a ranged request by streaming a slice of the stored full body.
 * Returns null when the Range header doesn't parse, the range is
 * unsatisfiable, or the stored response has no usable Content-Length — the
 * caller falls back to the full 200 response, which is a legal answer to a
 * Range request. The slice is streamed chunk by chunk, so peak memory is one
 * chunk — never the whole file. (Safari sends ranged requests on every seek;
 * materializing a 100MB live track per seek is an OOM on iOS.)
 */
export async function buildRangeResponse(
  full: Response,
  rangeHeader: string,
): Promise<Response | null> {
  const rangeMatch = rangeHeader.match(/bytes=(\d*)-(\d*)/);
  if (!rangeMatch) return null;
  const [, startPart, endPart] = rangeMatch;
  if (startPart === "" && endPart === "") return null;

  const total = Number(full.headers.get("Content-Length"));
  if (!Number.isSafeInteger(total) || total <= 0 || !full.body) return null;

  let start: number;
  let end: number;
  if (startPart === "") {
    // Suffix form (bytes=-N): the last N bytes of the file.
    const suffix = Number.parseInt(endPart, 10);
    if (suffix <= 0) return null;
    start = Math.max(0, total - suffix);
    end = total - 1;
  } else {
    start = Number.parseInt(startPart, 10);
    // An empty end means "to the end"; a literal 0 is valid (bytes=0-0 is the
    // first byte, not the whole file — no `||` fallback here).
    end =
      endPart === ""
        ? total - 1
        : Math.min(Number.parseInt(endPart, 10), total - 1);
  }
  if (start > end || start >= total) return null;

  return new Response(sliceStream(full.body, start, end), {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Accept-Ranges": "bytes",
      "Content-Length": (end - start + 1).toString(),
      "Content-Type": full.headers.get("Content-Type") || "audio/ogg",
    },
  });
}

/** The byte window [start, end] of a stream, without buffering the rest. */
function sliceStream(
  body: ReadableStream<Uint8Array>,
  start: number,
  end: number,
): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let position = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      // Loop until one chunk is enqueued (skipping chunks wholly before the
      // window), then yield back to the consumer's pull cadence.
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        const chunkStart = position;
        position += value.byteLength;
        if (position <= start) continue;
        controller.enqueue(
          value.subarray(
            Math.max(0, start - chunkStart),
            Math.min(value.byteLength, end + 1 - chunkStart),
          ),
        );
        if (position > end) {
          controller.close();
          reader.cancel().catch(() => {});
        }
        return;
      }
    },
    cancel(reason) {
      reader.cancel(reason).catch(() => {});
    },
  });
}
