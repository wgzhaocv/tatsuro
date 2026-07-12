"use client";

// The player core: a queue state machine in zustand, ported from the old
// site's usePlayerStore + usePlayerControlStore + useVolumeStore and merged
// into one store with the DOM coupling removed. The old code injected a
// `seekFn` closure (writing audio.currentTime) into the store; here the flow
// is one-directional: UI and engine both talk to the store, and the <audio>
// element (components/player/audio-engine) is the single subscriber that
// turns state into sound. Seeks travel as a nonce'd request the engine
// consumes; progress travels back through a separate transient store so
// timeupdate ticks never touch localStorage.
//
// Queue model (Spotify-style context, kept from the old store):
// - context: the list playback came from (an album edition), in track order
// - order/position: play order over context — identity, or a shuffle
//   permutation (indexes, so the context itself is never mutated)
// - userQueue: "play next" additions, consumed before the context advances
// - history: recently played, capped; also prev()'s fallback past the start

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Song } from "@/lib/api/types";

export type RepeatMode = "off" | "all" | "one";

export type PlayerState = {
  context: Song[];
  /** Play order: indexes into `context` — identity, or a shuffle permutation. */
  order: number[];
  /** Position in `order` of the context song being (last) played; -1 = none. */
  position: number;
  /** The song actually loaded — may come from userQueue rather than context. */
  current: Song | null;
  /** Where the context came from, e.g. the album name — shown in the player. */
  contextLabel: string | null;
  /** "Play next" queue, consumed before the context advances. */
  userQueue: Song[];
  /** Recently played (newest last, capped at 100). */
  history: Song[];
  isPlaying: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  /** 0–1. */
  volume: number;
  muted: boolean;
  /** Seek intent; the audio engine consumes it (nonce dedupes repeats). */
  seekRequest: { time: number; nonce: number } | null;
  /** Full-screen player open. */
  expanded: boolean;

  /** Play a list (album edition) starting at startIndex. */
  playQueue(songs: Song[], startIndex?: number, contextLabel?: string): void;
  /** Play one song immediately (context becomes just that song). */
  playNow(song: Song): void;
  addToQueue(songs: Song | Song[]): void;
  removeFromQueue(songId: string): void;
  clearUserQueue(): void;
  /** Current song + userQueue + rest of the context, for the queue screen. */
  upNext(): Song[];
  play(): void;
  pause(): void;
  toggle(): void;
  /** Advance; `auto` marks a track-ended advance (end of queue stops). */
  next(auto?: boolean): void;
  prev(): void;
  toggleShuffle(): void;
  cycleRepeat(): void;
  seek(time: number): void;
  setVolume(volume: number): void;
  toggleMute(): void;
  setExpanded(expanded: boolean): void;
  clear(): void;
};

/** Fisher–Yates over context indexes, with the given index pinned first. */
function shuffledOrder(length: number, firstIndex: number): number[] {
  const rest = Array.from({ length }, (_, i) => i).filter(
    (i) => i !== firstIndex,
  );
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [firstIndex, ...rest];
}

function pushHistory(history: Song[], song: Song | null): Song[] {
  if (!song) return history;
  return [...history, song].slice(-100);
}

let seekNonce = 0;
function seekTo(time: number) {
  return { time: Math.max(0, time), nonce: ++seekNonce };
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      context: [],
      order: [],
      position: -1,
      current: null,
      contextLabel: null,
      userQueue: [],
      history: [],
      isPlaying: false,
      shuffle: false,
      repeat: "off",
      volume: 1,
      muted: false,
      seekRequest: null,
      expanded: false,

      playQueue(songs, startIndex = 0, contextLabel) {
        if (songs.length === 0) return;
        const start = Math.min(Math.max(startIndex, 0), songs.length - 1);
        const { shuffle, history, current } = get();
        const order = shuffle
          ? shuffledOrder(songs.length, start)
          : songs.map((_, i) => i);
        const position = shuffle ? 0 : start;
        set({
          context: songs,
          order,
          position,
          current: songs[order[position]],
          contextLabel: contextLabel ?? null,
          userQueue: [],
          history: pushHistory(history, current),
          isPlaying: true,
          seekRequest: seekTo(0),
        });
      },

      playNow(song) {
        get().playQueue([song], 0);
      },

      addToQueue(songs) {
        const toAdd = Array.isArray(songs) ? songs : [songs];
        if (toAdd.length === 0) return;
        const { current, userQueue } = get();
        if (!current) {
          get().playQueue(toAdd, 0);
          return;
        }
        const queued = new Set(userQueue.map((s) => s.id));
        const fresh = toAdd.filter((s) => !queued.has(s.id));
        if (fresh.length > 0) set({ userQueue: [...userQueue, ...fresh] });
      },

      removeFromQueue(songId) {
        set({ userQueue: get().userQueue.filter((s) => s.id !== songId) });
      },

      clearUserQueue() {
        set({ userQueue: [] });
      },

      upNext() {
        const { current, userQueue, context, order, position } = get();
        const rest = order
          .slice(position + 1)
          .map((i) => context[i])
          .filter(Boolean);
        return [...(current ? [current] : []), ...userQueue, ...rest];
      },

      play() {
        if (get().current) set({ isPlaying: true });
      },
      pause() {
        set({ isPlaying: false });
      },
      toggle() {
        const { isPlaying, current } = get();
        if (current) set({ isPlaying: !isPlaying });
      },

      next(auto = false) {
        const {
          context,
          order,
          position,
          userQueue,
          repeat,
          current,
          history,
        } = get();
        if (!current) return;
        // repeat-one is handled by the engine's loop — an auto advance only
        // arrives here for the other modes; a manual next always moves on.
        const newHistory = pushHistory(history, current);

        if (userQueue.length > 0) {
          const [nextSong, ...rest] = userQueue;
          set({
            current: nextSong,
            userQueue: rest,
            history: newHistory,
            isPlaying: true,
          });
          return;
        }

        const last = order.length - 1;
        if (position < last) {
          const p = position + 1;
          set({
            position: p,
            current: context[order[p]],
            history: newHistory,
            isPlaying: true,
          });
        } else if (repeat === "all") {
          // Shuffle + repeat-all reshuffles each round, avoiding an immediate
          // repeat of the track that just ended (kept from the old store).
          const { shuffle } = get();
          let newOrder = order;
          if (shuffle && context.length > 1) {
            newOrder = shuffledOrder(context.length, 0);
            if (newOrder[0] === order[position]) {
              const swap =
                1 + Math.floor(Math.random() * (newOrder.length - 1));
              [newOrder[0], newOrder[swap]] = [newOrder[swap], newOrder[0]];
            }
          }
          set({
            order: newOrder,
            position: 0,
            current: context[newOrder[0]],
            history: newHistory,
            isPlaying: true,
          });
        } else if (auto) {
          // Queue ran out on its own: stop, rewound, ready to replay.
          set({
            history: newHistory,
            isPlaying: false,
            seekRequest: seekTo(0),
          });
        } else {
          const p = 0;
          set({
            position: p,
            current: context[order[p]],
            history: newHistory,
            isPlaying: true,
          });
        }
      },

      prev() {
        const { context, order, position, history, current } = get();
        if (!current) return;
        // Past the first seconds, restart the track instead (standard player
        // behaviour); the progress store is transient, read directly.
        if (useProgressStore.getState().currentTime > 3) {
          set({ seekRequest: seekTo(0), isPlaying: true });
          return;
        }
        if (position > 0) {
          const p = position - 1;
          set({
            position: p,
            current: context[order[p]],
            history: history.slice(0, -1),
            isPlaying: true,
          });
        } else if (history.length > 0) {
          set({
            current: history[history.length - 1],
            history: history.slice(0, -1),
            isPlaying: true,
          });
        } else {
          set({ seekRequest: seekTo(0), isPlaying: true });
        }
      },

      toggleShuffle() {
        const { shuffle, context, order, position } = get();
        if (context.length === 0) {
          set({ shuffle: !shuffle });
          return;
        }
        const currentIndex = position >= 0 ? order[position] : 0;
        if (shuffle) {
          set({
            shuffle: false,
            order: context.map((_, i) => i),
            position: currentIndex,
          });
        } else {
          set({
            shuffle: true,
            order: shuffledOrder(context.length, currentIndex),
            position: 0,
          });
        }
      },

      cycleRepeat() {
        const nextMode: Record<RepeatMode, RepeatMode> = {
          off: "all",
          all: "one",
          one: "off",
        };
        set({ repeat: nextMode[get().repeat] });
      },

      seek(time) {
        set({ seekRequest: seekTo(time) });
      },

      setVolume(volume) {
        set({ volume: Math.min(1, Math.max(0, volume)), muted: false });
      },
      toggleMute() {
        set({ muted: !get().muted });
      },

      setExpanded(expanded) {
        set({ expanded });
      },

      clear() {
        set({
          context: [],
          order: [],
          position: -1,
          current: null,
          contextLabel: null,
          userQueue: [],
          isPlaying: false,
          expanded: false,
          seekRequest: null,
        });
      },
    }),
    {
      name: "tatsuro-player",
      version: 1,
      // SSR renders an empty player; rehydrate after mount (AudioEngine) so
      // the first client render matches the server HTML.
      skipHydration: true,
      // Restore the queue and settings across visits, but always land paused
      // and collapsed — a page load must never start audio on its own. Unlike
      // the old store, `order` persists too, so a restored shuffle keeps its
      // sequence.
      partialize: (s) => ({
        context: s.context,
        order: s.order,
        position: s.position,
        current: s.current,
        contextLabel: s.contextLabel,
        userQueue: s.userQueue,
        history: s.history,
        shuffle: s.shuffle,
        repeat: s.repeat,
        volume: s.volume,
        muted: s.muted,
      }),
    },
  ),
);

/**
 * High-frequency playback progress, deliberately outside the persisted store:
 * timeupdate ticks re-render only the components that select from here.
 * `duration` prefers the API's figure over the element's — streamed audio
 * often misreports (the old store's realDuration, folded in).
 */
export type ProgressState = {
  currentTime: number;
  /** Element-reported duration (may be unreliable for streams). */
  elementDuration: number;
  setProgress(currentTime: number, elementDuration: number): void;
};

export const useProgressStore = create<ProgressState>()((set) => ({
  currentTime: 0,
  elementDuration: 0,
  setProgress(currentTime, elementDuration) {
    set({ currentTime, elementDuration });
  },
}));

/** Best-known duration of the current song: API metadata first, element second. */
export function useDuration(): number {
  const apiDuration = usePlayerStore((s) => s.current?.duration);
  const elementDuration = useProgressStore((s) => s.elementDuration);
  return apiDuration && apiDuration > 0 ? apiDuration : elementDuration;
}
