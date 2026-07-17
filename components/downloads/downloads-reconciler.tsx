"use client";

import { useEffect } from "react";
import { initDownloadsReconciler } from "@/lib/downloads/reconciler";

/**
 * Wires up the offline-downloads reconciler once, after mount. The reconciler
 * is a module singleton (all state lives there); this component just kicks its
 * trigger wiring (store subscriptions, online/visibility, the periodic sweep).
 * Renders nothing. Mounted in the ROOT layout beside AudioEngine so it never
 * remounts on a locale switch — the in-memory queue/failure state persists
 * across navigations, and a single init is guarded internally.
 */
export function DownloadsReconciler() {
  useEffect(() => {
    initDownloadsReconciler();
  }, []);

  return null;
}
