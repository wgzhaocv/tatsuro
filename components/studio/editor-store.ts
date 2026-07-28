import { createStore } from "zustand/vanilla";
import type { LyricsState } from "@/lib/api/studio";

/**
 * One timing session's whole mutable state — the lyric lines, the cursor, and
 * the transport readouts — as a store built per editor mount.
 *
 * Per mount matters: the editor is keyed on song.id, so a fresh store per song
 * is a fresh store per timing session. A module-level store would carry the
 * previous song's playhead into the next one and rely on somebody remembering
 * to zero it.
 *
 * The other reason this exists: the editor's keydown handler attaches once and
 * must never read stale values. Reading `store.getState()` gives it today's
 * values for free — no shadow refs mirroring every piece of useState.
 *
 * The <audio> element stays in the component. Actions that need the playhead
 * take it as an argument; actions that should move it return where to seek.
 */

// A line while it's being timed. startTime null = not yet stamped (serialized
// as 0). Ids are internal, for stable React keys through text edits.
export type EditLine = {
  id: number;
  origin: string;
  ja: string;
  en: string;
  startTime: number | null;
};

export const emptyLine = (id: number): EditLine => ({
  id,
  origin: "",
  ja: "",
  en: "",
  startTime: null,
});

// Stamps are compared and displayed to 2 decimals; rounding on every write
// keeps repeated 0.1s shifts from drifting into 12.300000000000004.
export const round = (t: number) => Math.round(t * 1000) / 1000;

// The content of an interlude/instrumental-break line — a bare note emoji.
export const INTERLUDE = "🎵";

export const RATES = [0.5, 0.75, 1, 1.25, 1.5];

/** The line currently sounding (for a karaoke highlight): the last stamped line
 *  at or before `time`. Unlike currentLineIndex in lib/api/lyrics, this skips
 *  not-yet-stamped lines, so it works mid-timing. */
export function activeLineIndex(lines: EditLine[], time: number): number {
  let active = -1;
  for (let i = 0; i < lines.length; i++) {
    const st = lines[i].startTime;
    if (st == null) continue;
    if (st <= time + 0.001) active = i;
    else break;
  }
  return active;
}

export type EditorState = {
  // ── the lyric being timed
  lines: EditLine[];
  cursor: number;
  lyricsState: LyricsState;
  dirty: boolean;
  /** A freshly inserted blank row, waiting for the DOM so it can be focused. */
  focusId: number | null;
  /** Bumped whenever the cursor moved on its own — a stamp, an arrow key, a
   *  song load. Clicking a row does NOT bump it, so the list never yanks
   *  itself out from under the pointer. */
  scrollNonce: number;

  // ── transport readouts, fed by the <audio> element's events
  time: number;
  duration: number;
  isPlaying: boolean;
  stalled: boolean;
  rate: number;
  offsetMs: number;

  newId: () => number;

  setProgress: (time: number, duration: number) => void;
  resetProgress: () => void;
  setPlaying: (v: boolean) => void;
  setStalled: (v: boolean) => void;
  setRate: (r: number) => void;
  bumpRate: (dir: number) => void;
  setOffsetMs: (ms: number) => void;

  setLyricsState: (s: LyricsState) => void;
  markSaved: (s: LyricsState) => void;

  /** Lines as fetched — lands on the first unstamped row, and is not a change
   *  the operator made, so it doesn't dirty the editor. */
  loadLines: (lines: EditLine[]) => void;
  /** Wholesale replacement from an import or the bulk text panel. */
  replaceLines: (lines: EditLine[]) => void;

  setLineOrigin: (index: number, origin: string) => void;
  /** @returns whether this stamp completed the song and promoted the state. */
  setLineTime: (index: number, value: number | null) => boolean;
  nudge: (index: number, delta: number) => void;
  /** @returns false when every stamp is already pinned at 0:00. */
  shiftAll: (delta: number) => boolean;
  /** @returns whether this stamp completed the song and promoted the state. */
  stampCursor: (now: number) => boolean;
  /** @returns the time to seek back to, or null if there was nothing to undo. */
  undoStamp: () => number | null;
  insertInterlude: (startTime: number | null) => void;
  insertLineBelow: (index: number, content?: string) => void;
  deleteLine: (index: number) => void;
  /** @returns that line's stamp, to seek to, or null if it has none. */
  selectLine: (index: number) => number | null;
  moveCursor: (delta: number) => void;
  clearFocusId: () => void;
};

export type EditorStore = ReturnType<typeof createEditorStore>;

export function createEditorStore(lyricsState: LyricsState) {
  // Monotonic ids for new lines. Not state — nothing renders from it.
  let nextId = 0;

  return createStore<EditorState>()((set, get) => {
    // Every change to the line list goes through here, so no caller can edit
    // the lyric and forget to flag it unsaved.
    const commit = (lines: EditLine[], extra: Partial<EditorState> = {}) =>
      set({ lines, dirty: true, ...extra });

    // Once every line carries a time there is nothing left to hand-time, so
    // the state promotes itself — one less thing to remember before saving.
    const promote = (lines: EditLine[]) => {
      if (lines.length === 0 || lines.some((l) => l.startTime == null)) {
        return false;
      }
      if (get().lyricsState === "verified") return false;
      set({ lyricsState: "verified" });
      return true;
    };

    return {
      lines: [],
      cursor: 0,
      lyricsState,
      dirty: false,
      focusId: null,
      scrollNonce: 0,

      time: 0,
      duration: 0,
      isPlaying: false,
      stalled: false,
      rate: 1,
      // Default tap latency compensation: you hear a line, then react, so the
      // press lands ~0.3s late — stamp that much earlier. Adjustable.
      offsetMs: 300,

      newId: () => nextId++,

      setProgress: (time, duration) => set({ time, duration }),
      resetProgress: () => set({ time: 0, duration: 0 }),
      setPlaying: (isPlaying) => set({ isPlaying }),
      setStalled: (stalled) => set({ stalled }),
      setRate: (rate) => set({ rate }),
      bumpRate: (dir) =>
        set((s) => {
          const i = RATES.indexOf(s.rate) + dir;
          return {
            rate: RATES[Math.min(RATES.length - 1, Math.max(0, i))] ?? s.rate,
          };
        }),
      setOffsetMs: (offsetMs) => set({ offsetMs }),

      setLyricsState: (s) => set({ lyricsState: s, dirty: true }),
      markSaved: (s) => set({ lyricsState: s, dirty: false }),

      loadLines: (lines) => {
        const firstUnstamped = lines.findIndex((l) => l.startTime == null);
        set({
          lines,
          cursor: firstUnstamped >= 0 ? firstUnstamped : 0,
          dirty: false,
          scrollNonce: get().scrollNonce + 1,
        });
      },

      replaceLines: (lines) => commit(lines, { cursor: 0 }),

      setLineOrigin: (index, origin) =>
        commit(get().lines.map((l, i) => (i === index ? { ...l, origin } : l))),

      setLineTime: (index, value) => {
        const lines = get().lines.map((l, i) =>
          i === index
            ? { ...l, startTime: value == null ? null : round(value) }
            : l,
        );
        commit(lines);
        return value == null ? false : promote(lines);
      },

      nudge: (index, delta) =>
        commit(
          get().lines.map((l, i) =>
            i === index
              ? {
                  ...l,
                  startTime: round(Math.max(0, (l.startTime ?? 0) + delta)),
                }
              : l,
          ),
        ),

      // Slide the whole track. A negative shift is capped at the earliest
      // stamp so the lines move as one block — clamping each line at 0
      // individually would quietly crush the spacing at the head of the song.
      shiftAll: (delta) => {
        const { lines } = get();
        const stamps = lines
          .map((l) => l.startTime)
          .filter((t): t is number => t != null);
        if (stamps.length === 0) return false;
        const d = delta < 0 ? Math.max(delta, -Math.min(...stamps)) : delta;
        if (d === 0) return false;
        commit(
          lines.map((l) =>
            l.startTime == null
              ? l
              : { ...l, startTime: round(l.startTime + d) },
          ),
        );
        return true;
      },

      stampCursor: (now) => {
        const { lines, cursor, scrollNonce } = get();
        if (!lines[cursor]) return false;
        const next = lines.map((l, i) =>
          i === cursor ? { ...l, startTime: round(now) } : l,
        );
        commit(next, {
          cursor: Math.min(cursor + 1, next.length - 1),
          scrollNonce: scrollNonce + 1,
        });
        return promote(next);
      },

      // Undo removes the *last* stamp, which always sits at cursor-1 (stamping
      // advances the cursor). At the top there's nothing to undo — a no-op, so
      // Backspace can't nuke line 0 or fake a dirty state on an empty song.
      undoStamp: () => {
        const { lines, cursor, scrollNonce } = get();
        if (cursor <= 0) return null;
        const back = cursor - 1;
        commit(
          lines.map((l, i) => (i === back ? { ...l, startTime: null } : l)),
          { cursor: back, scrollNonce: scrollNonce + 1 },
        );
        return lines[back - 1]?.startTime ?? 0;
      },

      // The 🎵 goes into the cursor's slot: the run is "Enter at the top of a
      // line, I when that line ends", and Enter has already moved the cursor
      // on, so the cursor's slot is exactly the gap after the line that just
      // finished. The cursor rides down with the insertion and keeps pointing
      // at the same lyric — the next one to stamp.
      insertInterlude: (startTime) => {
        const { lines, cursor } = get();
        commit(
          [
            ...lines.slice(0, cursor),
            { ...emptyLine(nextId++), origin: INTERLUDE, startTime },
            ...lines.slice(cursor),
          ],
          { cursor: cursor + 1 },
        );
      },

      // Insert after `index` (−1 to prepend) and select it. A blank line asks
      // for focus so it can be typed into straight away.
      insertLineBelow: (index, content = "") => {
        const { lines } = get();
        const id = nextId++;
        const at = Math.max(0, Math.min(index + 1, lines.length));
        commit(
          [
            ...lines.slice(0, at),
            { ...emptyLine(id), origin: content },
            ...lines.slice(at),
          ],
          { cursor: at, focusId: content ? null : id },
        );
      },

      deleteLine: (index) => {
        const lines = get().lines.filter((_, i) => i !== index);
        commit(lines, {
          cursor: Math.min(get().cursor, Math.max(lines.length - 1, 0)),
        });
      },

      selectLine: (index) => {
        set({ cursor: index });
        return get().lines[index]?.startTime ?? null;
      },

      moveCursor: (delta) =>
        set((s) => ({
          cursor: Math.min(
            Math.max(0, s.cursor + delta),
            Math.max(s.lines.length - 1, 0),
          ),
          scrollNonce: s.scrollNonce + 1,
        })),

      clearFocusId: () => set({ focusId: null }),
    };
  });
}
