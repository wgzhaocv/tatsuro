"use client";

// Web Audio tap on the player's <audio> element, for the spectrum display.
// One AudioContext + AnalyserNode per app, created lazily inside a user
// gesture (the engine's onPlay) — createMediaElementSource can only ever be
// called once per element, and an AudioContext started outside a gesture
// stays suspended. The element needs crossOrigin="anonymous" (the stream API
// sends ACAO: *), otherwise the analyser reads silence.

let context: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let attachedTo: HTMLAudioElement | null = null;

/** Create (once) or resume the analyser graph. Call from a user gesture. */
export function ensureAnalyser(el: HTMLAudioElement): AnalyserNode | null {
  try {
    if (attachedTo && attachedTo !== el) return null;
    if (!context) {
      context = new AudioContext();
      const source = context.createMediaElementSource(el);
      analyser = context.createAnalyser();
      analyser.fftSize = 512; // 256 bins — room for log-spaced slicing
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyser.connect(context.destination);
      attachedTo = el;
    }
    if (context.state === "suspended") void context.resume();
    return analyser;
  } catch {
    // No analyser is fine — the spectrum just stays quiet.
    return null;
  }
}

export function getAnalyser(): AnalyserNode | null {
  return analyser;
}
