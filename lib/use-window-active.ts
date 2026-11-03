"use client";

import { useSyncExternalStore } from "react";

// Whether anyone can be watching: the tab is visible AND the window has
// focus. Gate decorative motion on it — any running loop keeps the compositor
// redrawing the whole frame, and listening with this window behind another
// app is the common case (the browser throttles hidden tabs, not unfocused
// ones).

function subscribe(onChange: () => void) {
  window.addEventListener("focus", onChange);
  window.addEventListener("blur", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.removeEventListener("focus", onChange);
    window.removeEventListener("blur", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

const getSnapshot = () =>
  document.visibilityState === "visible" && document.hasFocus();

// Assume active on the server so the first paint matches a focused page.
const getServerSnapshot = () => true;

export function useWindowActive(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
