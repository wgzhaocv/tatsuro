"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { coverUrl, songStreamUrl } from "@/lib/api/urls";
import { ARTIST } from "@/lib/constants";
import { ensureAnalyser } from "@/lib/player/analyser";
import { usePlayerStore, useProgressStore } from "@/lib/player/store";

// ─────────────────────────────────────────────────────────────────────────────
// The one place state becomes sound. Renders the hidden <audio> element and
// keeps it in lockstep with the player store: src follows the current song,
// play/pause follows isPlaying, seek requests are consumed by nonce, and
// timeupdate/ended flow back into the stores. Also owns MediaSession, media
// keys, and cross-tab exclusivity.
//
// The iOS audio-focus arbitration is ported as-is from the old site's
// MusicPlayerCore — it distinguishes two kinds of *external* pauses:
// - the system auto-pausing on lock/背景切换 → fight back (resume), which is
//   what keeps background playback alive on iOS Safari
// - another app claiming audio focus while the page is already hidden →
//   yield (explicit pause() clears WebKit's interrupted-will-resume intent so
//   a "ghost resume" can't grab the audio route back)
// The two are told apart by the pause↔visibilitychange time gap; when unsure
// the playing intent is suspended for 400ms before the verdict, and after a
// yield the element stays muted for a 3s guard window.
//
// The auto-pause being fought is a WebKit-on-iOS behavior — on other
// platforms an external pause is legitimate (headphones out, another app),
// so there the engine simply honors it.
// ─────────────────────────────────────────────────────────────────────────────

const isIOSWebKit =
  typeof navigator !== "undefined" &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) ||
    // iPadOS reports itself as MacIntel; the touch points give it away.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

export function AudioEngine() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const loadedSongId = useRef<string | null>(null);
  const consumedSeekNonce = useRef<number>(0);
  // Consecutive-failure count; stops error-skipping from looping forever.
  const errorStreak = useRef(0);

  // Persisted state is skipped during SSR/hydration; restore it once mounted.
  useEffect(() => {
    usePlayerStore.persist.rehydrate();
  }, []);

  // Defense in depth against the double-audio bug: a media element detached
  // from the DOM keeps playing until GC'd. The engine now lives above
  // `[locale]` so it shouldn't remount on a language switch — but if any future
  // remount does detach this element, silence it first so it can't play on
  // alongside its replacement.
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (!audio) return;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    };
  }, []);

  const song = usePlayerStore((s) => s.current);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const repeat = usePlayerStore((s) => s.repeat);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const seekRequest = usePlayerStore((s) => s.seekRequest);

  // ── iOS audio-focus arbitration state ──
  const [isSuspended, setIsSuspendedState] = useState(false);
  const suspendedRef = useRef(false);
  const setSuspended = useCallback((v: boolean) => {
    suspendedRef.current = v;
    setIsSuspendedState(v);
  }, []);
  const [isYieldGuarding, setIsYieldGuarding] = useState(false);
  const yieldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const yieldedAtRef = useRef(0);
  const hiddenAtRef = useRef<number | null>(null);
  const lastSrcChangeRef = useRef(0);
  const lastPositionUpdateRef = useRef(0);

  useEffect(() => {
    const onVisibility = () => {
      hiddenAtRef.current =
        document.visibilityState === "hidden" ? Date.now() : null;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(
    () => () => {
      if (yieldTimerRef.current) clearTimeout(yieldTimerRef.current);
      if (guardTimerRef.current) clearTimeout(guardTimerRef.current);
    },
    [],
  );

  // A user-initiated resume (any entry point) lifts the guard mute at once.
  useEffect(() => {
    if (!isPlaying) return;
    if (guardTimerRef.current) clearTimeout(guardTimerRef.current);
    setIsYieldGuarding(false);
  }, [isPlaying]);

  // play() failed (stream connection gone stale after a long suspend):
  // reload the source and restore the position before giving up.
  const attemptRecovery = useCallback((el: HTMLAudioElement) => {
    const resumeAt = el.currentTime;
    el.play().catch(() => {
      el.load();
      el.currentTime = resumeAt;
      el.play().catch(() => usePlayerStore.getState().pause());
    });
  }, []);

  // External (not app-initiated) pauses, from onTimeUpdate and onPause. The
  // spec fires a timeupdate before pause, so entering from timeupdate wins
  // the race against a re-render resuming playback mid-verdict.
  const handleExternalPause = (el: HTMLAudioElement) => {
    if (!usePlayerStore.getState().isPlaying) return;
    if (suspendedRef.current) return;
    // Natural track end belongs to onEnded; Safari may fire pause before
    // `ended` is set, so "close to the end" also counts (protects autoplay).
    if (el.ended) return;
    if (el.duration > 0 && el.duration - el.currentTime < 0.5) return;
    if (Date.now() - lastSrcChangeRef.current < 500) return;

    // Outside iOS WebKit there is no auto-pause to fight — an external pause
    // is real; just sync the store to it.
    if (!isIOSWebKit) {
      usePlayerStore.getState().pause();
      return;
    }

    const pausedAt = Date.now();
    const hiddenAt = hiddenAtRef.current;
    if (hiddenAt !== null && pausedAt - hiddenAt < 2000) {
      // Just locked / backgrounded: iOS auto-pause → fight back immediately.
      attemptRecovery(el);
      return;
    }

    // Origin unclear — suspend the playing intent and decide in 400ms, when
    // a late visibilitychange will have arrived.
    setSuspended(true);
    yieldTimerRef.current = setTimeout(() => {
      setSuspended(false);
      const h = hiddenAtRef.current;
      if (h !== null && Math.abs(pausedAt - h) < 2000) {
        attemptRecovery(el);
      } else {
        // Another app took audio focus / headphones out / a call → yield.
        // The explicit pause() clears WebKit's resume-after-interruption
        // intent, which is what stops the ghost resume.
        yieldedAtRef.current = Date.now();
        usePlayerStore.getState().pause();
        el.pause();
        setIsYieldGuarding(true);
        if (guardTimerRef.current) clearTimeout(guardTimerRef.current);
        guardTimerRef.current = setTimeout(
          () => setIsYieldGuarding(false),
          3000,
        );
      }
    }, 400);
  };

  // ── src follows the current song ──
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !song) return;
    if (loadedSongId.current === song.id) return;
    loadedSongId.current = song.id;
    lastSrcChangeRef.current = Date.now();
    // A song change is a fresh playing intent — cancel a pending verdict.
    if (yieldTimerRef.current) clearTimeout(yieldTimerRef.current);
    if (guardTimerRef.current) clearTimeout(guardTimerRef.current);
    setSuspended(false);
    setIsYieldGuarding(false);
    audio.src = songStreamUrl(song.id);
    useProgressStore.getState().setProgress(0, 0);
    if (usePlayerStore.getState().isPlaying) {
      audio.play().catch(() => usePlayerStore.getState().pause());
    }
  }, [song, setSuspended]);

  // ── play/pause follows the store (minus a suspended verdict window) ──
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !song) return;
    if (isPlaying && !isSuspended) {
      if (audio.paused) {
        audio.play().catch(() => usePlayerStore.getState().pause());
      }
    } else if (!isPlaying) {
      audio.pause();
    }
  }, [isPlaying, isSuspended, song]);

  // isPlaying says play but the element is still paused after 300ms (silent
  // play() failure, stale stream) → actively recover. Re-armed on every song
  // change too — a track-boundary stall happens while isPlaying never flips.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `song` re-arms the watchdog, it isn't read
  useEffect(() => {
    if (!isPlaying) return;
    const el = audioRef.current;
    if (!el) return;
    const timer = setTimeout(() => {
      if (suspendedRef.current) return;
      if (!el.paused || el.ended) return;
      attemptRecovery(el);
    }, 300);
    return () => clearTimeout(timer);
  }, [isPlaying, song, attemptRecovery]);

  // ── volume / mute (guard windows stay silent) ──
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = muted || isSuspended || isYieldGuarding;
  }, [volume, muted, isSuspended, isYieldGuarding]);

  // ── seek requests (nonce'd so the same time can be requested twice) ──
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !seekRequest) return;
    if (consumedSeekNonce.current === seekRequest.nonce) return;
    consumedSeekNonce.current = seekRequest.nonce;
    audio.currentTime = seekRequest.time;
  }, [seekRequest]);

  // ── MediaSession: metadata + lock-screen / hardware controls ──
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    if (song) {
      const artwork = song.coverFrontId
        ? [128, 256, 512].map((s) => ({
            src: coverUrl(song.coverFrontId as string),
            sizes: `${s}x${s}`,
          }))
        : [];
      ms.metadata = new MediaMetadata({
        title: song.name,
        artist: ARTIST,
        album: song.albumName ?? "",
        artwork,
      });
    }
    const store = usePlayerStore.getState;
    ms.setActionHandler("play", () => store().play());
    ms.setActionHandler("pause", () => store().pause());
    ms.setActionHandler("previoustrack", () => store().prev());
    ms.setActionHandler("nexttrack", () => store().next());
    ms.setActionHandler("seekto", (e) => {
      if (e.seekTime != null) store().seek(e.seekTime);
    });
    return () => {
      for (const action of [
        "play",
        "pause",
        "previoustrack",
        "nexttrack",
        "seekto",
      ] as MediaSessionAction[]) {
        ms.setActionHandler(action, null);
      }
    };
  }, [song]);

  // ── MediaSession playbackState: tell the OS play vs pause ──
  // Browsers do NOT infer this from the <audio> element — it must be set
  // explicitly (MDN), and without it the session sits at "none", which leaves
  // the lock-screen / AirPods play·pause icon wrong and makes iOS likelier to
  // drop the remote-control target. Mirror the store's playing INTENT, not the
  // raw element: during the iOS auto-pause fight the element pauses for a beat
  // while isPlaying stays true, and the controls should stay "playing" through
  // it rather than flicker. (It can't un-suspend a frozen background tab — that
  // needs the standalone PWA process — but it keeps the session correct and
  // resumable for as long as the tab lives.)
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    let state: MediaSessionPlaybackState = "none";
    if (song) state = isPlaying ? "playing" : "paused";
    navigator.mediaSession.playbackState = state;
  }, [isPlaying, song]);

  useEffect(() => {
    try {
      // iOS 16.4+: keep the audio session alive in the background.
      const session = (navigator as { audioSession?: { type: string } })
        .audioSession;
      if (session) session.type = "playback";
    } catch {
      // Experimental API — absence is fine.
    }
  }, []);

  // ── media/space keys: Space toggles (outside form fields), ←/→ jump 5s ──
  useEffect(() => {
    const isEditable = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      (t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.tagName === "SELECT" ||
        t.isContentEditable ||
        t.getAttribute("role") === "slider" ||
        t.tagName === "BUTTON");
    const onKeyDown = (e: KeyboardEvent) => {
      const store = usePlayerStore.getState();
      if (!store.current) return;
      if (e.key === " " && !isEditable(e.target)) {
        e.preventDefault();
        store.toggle();
      } else if (e.key === "ArrowLeft" && !isEditable(e.target)) {
        store.seek(Math.max(0, useProgressStore.getState().currentTime - 5));
      } else if (e.key === "ArrowRight" && !isEditable(e.target)) {
        store.seek(useProgressStore.getState().currentTime + 5);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ── cross-tab exclusivity: the tab whose audio actually starts wins.
  // Claims are broadcast from the element's onPlay (confirmed playback), not
  // from store intent — an intent whose play() then fails must not silence
  // the tab that is really playing.
  const channelRef = useRef<BroadcastChannel | null>(null);
  // Assigned in the effect — Math.random() must not run during render.
  const tabIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    tabIdRef.current ??= Math.random().toString(36).slice(2);
    const channel = new BroadcastChannel("tatsuro-player");
    channelRef.current = channel;
    channel.onmessage = (e) => {
      if (e.data?.type === "claim" && e.data.id !== tabIdRef.current) {
        usePlayerStore.getState().pause();
      }
    };
    return () => {
      channelRef.current = null;
      channel.close();
    };
  }, []);

  return (
    // biome-ignore lint/a11y/useMediaCaption: music streams have no captions
    <audio
      ref={audioRef}
      preload="metadata"
      // CORS-clean media so the spectrum's AnalyserNode hears it (the stream
      // API sends ACAO: *); without this Web Audio reads pure silence.
      crossOrigin="anonymous"
      loop={repeat === "one"}
      onDurationChange={(e) => {
        const a = e.currentTarget;
        useProgressStore.getState().setProgress(a.currentTime, a.duration || 0);
      }}
      onTimeUpdate={(e) => {
        const a = e.currentTarget;
        if (a.paused) handleExternalPause(a);
        useProgressStore.getState().setProgress(a.currentTime, a.duration || 0);
        // The platform extrapolates position from playbackRate between
        // updates — refresh at most once a second, not per tick.
        if (
          "mediaSession" in navigator &&
          a.duration > 0 &&
          Date.now() - lastPositionUpdateRef.current > 1000
        ) {
          lastPositionUpdateRef.current = Date.now();
          navigator.mediaSession.setPositionState({
            duration: a.duration,
            position: Math.min(a.currentTime, a.duration),
            playbackRate: a.playbackRate,
          });
        }
      }}
      onPause={(e) => handleExternalPause(e.currentTarget)}
      onPlay={(e) => {
        const el = e.currentTarget;
        // Auto-resumed by the system during a pending verdict → hold it down.
        if (suspendedRef.current) {
          el.pause();
          return;
        }
        // Ghost resume shortly after a yield (WebKit treats the route change
        // as a resumable interruption) → press it back. Later auto-resumes
        // (e.g. after a call ends) are welcome.
        if (
          !usePlayerStore.getState().isPlaying &&
          Date.now() - yieldedAtRef.current < 3000
        ) {
          el.pause();
          return;
        }
        usePlayerStore.getState().play();
        // Confirmed playback — silence any other tab.
        channelRef.current?.postMessage({
          type: "claim",
          id: tabIdRef.current,
        });
        // First real playback is a user gesture: safe to build the Web Audio
        // graph for the spectrum (a no-op on later plays).
        ensureAnalyser(el);
      }}
      onPlaying={() => {
        // Real audio is flowing: the error guard only covers a *consecutive*
        // failure chain, it never blacklists a song for the session.
        errorStreak.current = 0;
      }}
      onEnded={() => usePlayerStore.getState().next(true)}
      onError={() => {
        const state = usePlayerStore.getState();
        if (!state.current) return;
        // Skip the broken track, but once a whole queue has failed in a row
        // (network gone, repeat-all would spin forever) stop knocking.
        errorStreak.current += 1;
        if (errorStreak.current > Math.max(state.context.length, 1)) {
          state.pause();
          return;
        }
        state.next(true);
      }}
    />
  );
}
