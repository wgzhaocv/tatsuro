// Shared cache-event publisher, worker- and page-safe. One long-lived
// BroadcastChannel per name (opening/closing per message is pure overhead), so
// the SW, the reconciler, and the eviction helper all emit the same
// {type, data:{url, reason?}} shape that lib/cache/audio-cache-status consumes
// — one wire contract, one producer.

const channels = new Map<string, BroadcastChannel>();

function channel(name: string): BroadcastChannel {
  let ch = channels.get(name);
  if (!ch) {
    ch = new BroadcastChannel(name);
    channels.set(name, ch);
  }
  return ch;
}

export function postCacheEvent(
  channelName: string,
  type: string,
  url: string,
  reason?: string,
): void {
  channel(channelName).postMessage({ type, data: { url, reason } });
}
