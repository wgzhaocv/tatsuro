import type { StateStorage } from "zustand/middleware";

/**
 * Trailing-debounced localStorage for zustand persist. Each persist write
 * serializes the whole store — high-frequency setters (a volume drag fires per
 * pointer move; one like toggles two set()s over a denormalized library) would
 * JSON.stringify + write that blob many times a second on the main thread.
 * This caps it at one write per `delayMs`, with a pagehide flush so the last
 * state survives a quick tab close. Each store gets its own instance (its own
 * pending write and timer), so stores can't cancel each other's writes.
 */
export function createDebouncedLocalStorage(delayMs = 300): StateStorage {
  let pendingWrite: (() => void) | null = null;
  let writeTimer: ReturnType<typeof setTimeout> | null = null;
  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", () => pendingWrite?.());
  }
  return {
    getItem: (name) => localStorage.getItem(name),
    removeItem: (name) => localStorage.removeItem(name),
    setItem: (name, value) => {
      pendingWrite = () => {
        localStorage.setItem(name, value);
        pendingWrite = null;
      };
      if (writeTimer) clearTimeout(writeTimer);
      writeTimer = setTimeout(() => pendingWrite?.(), delayMs);
    },
  };
}
