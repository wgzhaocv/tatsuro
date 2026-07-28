"use client";

import {
  ArrowUUpLeft,
  Crosshair,
  DownloadSimple,
  Eraser,
  FastForward,
  FloppyDisk,
  MusicNote,
  Pause,
  Play,
  Plus,
  Rewind,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useStore } from "zustand";
import { Scrubber } from "@/components/player/scrubber";
import { Button } from "@/components/ui/button";
import { TipButton } from "@/components/ui/tip-button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fetchLyrics } from "@/lib/api/lyrics";
import {
  LYRICS_STATES,
  type LyricsState,
  type StatusSong,
  saveLyrics,
  WrongPasswordError,
} from "@/lib/api/studio";
import { songStreamUrl } from "@/lib/api/urls";
import { formatDuration, formatTimecode } from "@/lib/format";
import { isJapanese } from "@/lib/text";
import { cn } from "@/lib/utils";
import {
  activeLineIndex,
  createEditorStore,
  type EditLine,
  type EditorStore,
  RATES,
  round,
} from "./editor-store";

function tc(sec: number | null): string {
  return sec == null || sec < 0 ? "—:——" : formatTimecode(sec);
}

function parseTime(raw: string): number | null {
  const v = raw.trim();
  if (!v) return null;
  if (v.includes(":")) {
    const [m, s] = v.split(":");
    const mm = Number(m);
    const ss = Number(s);
    const total = mm * 60 + ss;
    if (Number.isFinite(mm) && Number.isFinite(ss) && total >= 0) return total;
    return null;
  }
  const n = Number(v);
  // Reject negatives: they'd display as "unstamped" and save as 0, silently
  // dropping what the operator typed.
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// Whole-track timing corrections, in seconds: a coarse pass and a fine one.
const SHIFTS = [-1, -0.1, 0.1, 1];

const verifiedToast = () =>
  toast.success("Every line is timed — state set to verified.");

/** MediaError codes in words. The operator needs to tell "the API is down"
 *  apart from "this song has no file on R2" without opening devtools. */
function mediaErrorText(err: MediaError | null): string {
  switch (err?.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return "load aborted";
    case MediaError.MEDIA_ERR_NETWORK:
      return "network dropped";
    case MediaError.MEDIA_ERR_DECODE:
      return "the audio is corrupt";
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return "no playable file at that URL";
    default:
      return "unknown cause";
  }
}

// A row in an imported lyrics file — either this editor's export shape
// ({startTime, origin, ja, en}) or the raw API wire shape ({startTime,
// lyrics:{...}}). Fields are unknown until coerced.
type ImportRow = {
  startTime?: unknown;
  origin?: unknown;
  ja?: unknown;
  en?: unknown;
  lyrics?: { origin?: unknown; ja?: unknown; en?: unknown };
};

const isEditableTarget = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.tagName === "INPUT" ||
    t.tagName === "TEXTAREA" ||
    t.tagName === "SELECT" ||
    t.tagName === "BUTTON" ||
    t.isContentEditable);

export function LyricEditor({
  song,
  password,
  onDirtyChange,
  onSaved,
}: {
  song: StatusSong;
  password: string;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: (id: string, state: LyricsState) => void;
}) {
  // One store per mount, and the editor remounts per song — so this is one
  // store per timing session. Every callback below reads it through
  // getState(), which is why none of them need a shadow ref to stay fresh.
  const [store] = useState(() => createEditorStore(song.state));

  const audioRef = useRef<HTMLAudioElement>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const inputRefs = useRef(new Map<number, HTMLInputElement>());
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Where the last silent reload happened, or null while a retry is still
  // available — see the <audio> onError handler.
  const retriedAtRef = useRef<number | null>(null);
  const resumeRef = useRef<{ at: number; wasPlaying: boolean } | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showText, setShowText] = useState(false);

  const lines = useStore(store, (s) => s.lines);
  const cursor = useStore(store, (s) => s.cursor);
  const state = useStore(store, (s) => s.lyricsState);
  const dirty = useStore(store, (s) => s.dirty);
  const isPlaying = useStore(store, (s) => s.isPlaying);
  const stalled = useStore(store, (s) => s.stalled);
  const rate = useStore(store, (s) => s.rate);
  const offsetMs = useStore(store, (s) => s.offsetMs);
  const focusId = useStore(store, (s) => s.focusId);
  const scrollNonce = useStore(store, (s) => s.scrollNonce);
  // Only when activeIndex crosses a boundary does the editor re-render — the
  // ~4Hz ticks in between move the clock/seek-bar leaves, which subscribe to
  // `time` themselves, not this component.
  const activeIndex = useStore(store, (s) => activeLineIndex(s.lines, s.time));

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  // ── load lyrics + point the audio element at the stream ──
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    store.getState().resetProgress();
    fetchLyrics(song.id)
      .then((fetched) => {
        if (cancelled) return;
        const { newId, loadLines } = store.getState();
        loadLines(
          fetched.map((l) => ({
            id: newId(),
            origin: l.origin,
            ja: l.ja ?? "",
            en: l.en ?? "",
            startTime: l.startTime > 0 ? l.startTime : null,
          })),
        );
      })
      .catch(() => !cancelled && setLoadError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [song.id, store]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = rate;
  }, [rate]);

  // Switching songs remounts this editor (key={song.id}). A detached <audio>
  // keeps playing until GC, so the previous song would play on as a ghost
  // while the new editor's button controls a different, silent element —
  // making play/pause look broken. Pausing on unmount stops it. (Only pause —
  // clearing src here would be stripped by StrictMode's mount/cleanup/mount
  // and, since src is a static prop, never restored.)
  useEffect(() => {
    const audio = audioRef.current;
    return () => audio?.pause();
  }, []);

  // ── transport ──
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    store.getState().setStalled(false);
    audio.play().catch((err: DOMException) => {
      // Switching songs pauses the outgoing element mid-play(), which rejects
      // the promise — expected teardown, not a failure worth reporting.
      if (err.name === "AbortError") return;
      // Anything else means the stream never started. play() fires `play`
      // before it fails, so isPlaying is already true and the button is
      // showing Pause on a track that isn't moving — put it back.
      store.getState().setPlaying(false);
      store.getState().setStalled(false);
      // A broken stream rejects here *and* fires `error`; that handler names
      // the actual cause, so stay quiet and let it do the talking. This
      // message is for the rejections it can't explain — autoplay blocks.
      if (!audio.error) toast.error(`Couldn't play this track — ${err.name}.`);
    });
  }, [store]);

  const seek = useCallback((t: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const max = audio.duration || Number.POSITIVE_INFINITY;
    audio.currentTime = Math.min(Math.max(0, t), max);
  }, []);

  const bumpRate = useCallback(
    (dir: number) => store.getState().bumpRate(dir),
    [store],
  );

  /** The playhead, corrected for tap latency — the clock every stamp uses. */
  const stampTime = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return null;
    return round(
      Math.max(0, audio.currentTime - store.getState().offsetMs / 1000),
    );
  }, [store]);

  // Return focus to the body after a click so Space/arrows reach the global
  // keydown handler instead of re-triggering the button.
  const press = useCallback(
    (fn: () => void) => (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.blur();
      fn();
    },
    [],
  );

  // ── editing — the rules live in the store; these only bridge it to the
  // audio element (which supplies the playhead and does the seeking) and to
  // the toasts, which the store deliberately doesn't raise itself. ──
  const stampCursor = useCallback(() => {
    const t = stampTime();
    if (t != null && store.getState().stampCursor(t)) verifiedToast();
  }, [store, stampTime]);

  const undoStamp = useCallback(() => {
    const back = store.getState().undoStamp();
    if (back != null) seek(back);
  }, [store, seek]);

  const setLineTime = useCallback(
    (index: number, value: number | null) => {
      if (store.getState().setLineTime(index, value)) verifiedToast();
    },
    [store],
  );

  const setLineOrigin = useCallback(
    (index: number, value: string) =>
      store.getState().setLineOrigin(index, value),
    [store],
  );

  const nudge = useCallback(
    (index: number, delta: number) => store.getState().nudge(index, delta),
    [store],
  );

  const shiftAll = useCallback(
    (delta: number) => {
      if (!store.getState().shiftAll(delta)) {
        toast("The first stamp is already at 0:00 — can't shift earlier.");
      }
    },
    [store],
  );

  const stampHere = useCallback(
    (index: number) => setLineTime(index, stampTime() ?? 0),
    [setLineTime, stampTime],
  );

  const insertLineBelow = useCallback(
    (index: number, content = "") =>
      store.getState().insertLineBelow(index, content),
    [store],
  );

  const insertInterlude = useCallback(
    () => store.getState().insertInterlude(null),
    [store],
  );

  // The one you can hit without looking away from the music — already stamped
  // at the playhead, on the same offset-corrected clock Enter uses.
  const insertInterludeNow = useCallback(() => {
    const t = stampTime();
    if (t != null) store.getState().insertInterlude(t);
  }, [store, stampTime]);

  const deleteLine = useCallback(
    (index: number) => store.getState().deleteLine(index),
    [store],
  );

  const selectAndSeek = useCallback(
    (index: number) => {
      const at = store.getState().selectLine(index);
      if (at != null) seek(at);
    },
    [store, seek],
  );

  const moveCursor = useCallback(
    (delta: number) => store.getState().moveCursor(delta),
    [store],
  );

  // ── keyboard: attach once, at capture phase so the global player's window
  // handler (Space / arrows) never also fires. Bails while a field is focused. ──
  useEffect(() => {
    const actions: Record<string, () => void> = {
      " ": togglePlay,
      Enter: stampCursor,
      Backspace: undoStamp,
      ArrowUp: () => moveCursor(-1),
      ArrowDown: () => moveCursor(1),
      ArrowLeft: () => seek((audioRef.current?.currentTime ?? 0) - 3),
      ArrowRight: () => seek((audioRef.current?.currentTime ?? 0) + 3),
      "[": () => bumpRate(-1),
      "]": () => bumpRate(1),
      i: insertInterludeNow,
      I: insertInterludeNow,
    };
    const handler = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const action = actions[e.key];
      if (!action) return;
      e.preventDefault();
      e.stopPropagation();
      action();
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [
    togglePlay,
    stampCursor,
    undoStamp,
    moveCursor,
    seek,
    bumpRate,
    insertInterludeNow,
  ]);

  // Keep the cursor line in view as it advances. Only the store's own cursor
  // moves bump scrollNonce — clicking a row doesn't, so the list never yanks
  // that row to the middle out from under the pointer.
  useEffect(() => {
    if (scrollNonce === 0) return;
    rowRefs.current[store.getState().cursor]?.scrollIntoView({
      block: "center",
    });
  }, [scrollNonce, store]);

  // Focus a freshly inserted line's text field, once it has rendered.
  useEffect(() => {
    if (focusId == null) return;
    inputRefs.current.get(focusId)?.focus();
    store.getState().clearFocusId();
  }, [focusId, store]);

  const timedCount = lines.filter((l) => l.startTime != null).length;

  // ── save ──
  const handleSave = useCallback(async () => {
    if (!password) {
      toast.error("Enter the lyrics password first (top right).");
      return;
    }
    // The player (and this editor) resolve the current line assuming stamps
    // increase down the list; a manual nudge/edit can break that. Warn rather
    // than block — the operator may be mid-fix and know better.
    const stamped = lines
      .map((l) => l.startTime)
      .filter((t): t is number => t != null);
    const outOfOrder = stamped.some((t, i) => i > 0 && t < stamped[i - 1]);
    if (
      outOfOrder &&
      !window.confirm(
        "Some timestamps run out of order (a line is timed before the one above it). The player highlights lines assuming they increase. Save anyway?",
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const { state: settled } = await saveLyrics(
        song.id,
        lines.map((l) => ({
          startTime: l.startTime ?? 0,
          origin: l.origin,
          ja: l.ja || undefined,
          en: l.en || undefined,
        })),
        state,
        password,
      );
      onSaved(song.id, settled);
      // The backend may coerce the state (e.g. empty lyrics → 'none'); adopt
      // what it settled on so a re-save doesn't resend the stale value.
      store.getState().markSaved(settled);
      toast.success(`Saved · ${settled}`);
    } catch (err) {
      if (err instanceof WrongPasswordError) {
        toast.error("Wrong lyrics password.");
      } else {
        toast.error("Save failed. Check the connection and try again.");
      }
    } finally {
      setSaving(false);
    }
  }, [password, song.id, lines, state, onSaved, store]);

  // ── export / import a full timed lyric file (copy timing between same-named
  // songs — live versions, reissues — instead of re-timing each by hand) ──
  const exportLyrics = useCallback(() => {
    const data = lines.map((l) => ({
      startTime: l.startTime ?? 0,
      origin: l.origin,
      ...(l.ja ? { ja: l.ja } : {}),
      ...(l.en ? { en: l.en } : {}),
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safe = song.name.replace(/[\\/:*?"<>|]+/g, "_").trim();
    a.download = `${safe || song.id}.lyrics.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [lines, song]);

  const importFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          const arr: ImportRow[] = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed?.lyrics)
              ? parsed.lyrics
              : [];
          if (arr.length === 0) throw new Error("empty");
          const { newId, replaceLines } = store.getState();
          const next: EditLine[] = arr.map((row) => {
            const origin = row.origin ?? row.lyrics?.origin ?? "";
            const ja = row.ja ?? row.lyrics?.ja ?? "";
            const en = row.en ?? row.lyrics?.en ?? "";
            const st =
              typeof row.startTime === "number" && row.startTime > 0
                ? row.startTime
                : null;
            return {
              id: newId(),
              origin: String(origin),
              ja: ja ? String(ja) : "",
              en: en ? String(en) : "",
              startTime: st,
            };
          });
          replaceLines(next);
          toast.success(`Imported ${next.length} lines — review and save.`);
        } catch {
          toast.error(
            "Couldn't read that file — expected exported lyrics JSON.",
          );
        }
      };
      reader.readAsText(file);
    },
    [store],
  );

  // ── bulk text import / edit ──
  const applyText = useCallback(
    (origin: string, ja: string, en: string) => {
      const o = origin.split(/\r?\n/);
      const j = ja.split(/\r?\n/);
      const e = en.split(/\r?\n/);
      // Drop a single trailing blank line (textarea artifact) but keep
      // intentional internal blanks (verse breaks).
      if (o.length > 1 && o[o.length - 1].trim() === "") o.pop();
      const { lines: prev, newId, replaceLines } = store.getState();
      // Preserve id + timing by row position so fixing a typo doesn't re-time.
      replaceLines(
        o.map((line, i) => ({
          id: prev[i]?.id ?? newId(),
          origin: line,
          ja: (j[i] ?? "").trim(),
          en: (e[i] ?? "").trim(),
          startTime: prev[i]?.startTime ?? null,
        })),
      );
      setShowText(false);
    },
    [store],
  );

  return (
    <div className="flex h-full flex-col">
      {/* biome-ignore lint/a11y/useMediaCaption: admin scrubbing tool, no captions */}
      <audio
        ref={audioRef}
        src={songStreamUrl(song.id)}
        preload="metadata"
        // Without this the element requests the stream no-cors, and the
        // service worker can only hand back an opaque response on a cache
        // miss — unusable for ranged playback, so every song the worker
        // hasn't cached yet dies on arrival with MEDIA_ERR_NETWORK. The
        // site player has always set it (components/player/audio-engine).
        crossOrigin="anonymous"
        onLoadedMetadata={(e) => {
          const audio = e.currentTarget;
          // Landing after a retry: put the playhead back where the drop
          // interrupted it, and carry on if it was playing.
          const resume = resumeRef.current;
          resumeRef.current = null;
          if (resume) {
            if (resume.at > 0) {
              audio.currentTime = Math.min(
                resume.at,
                audio.duration || resume.at,
              );
            }
            store
              .getState()
              .setProgress(audio.currentTime, audio.duration || 0);
            if (resume.wasPlaying) audio.play().catch(() => {});
            return;
          }
          store.getState().setProgress(0, audio.duration || 0);
        }}
        onTimeUpdate={(e) => {
          const audio = e.currentTarget;
          // Three clean seconds past the last silent reload means it worked;
          // a later drop earns its own. Anything shorter and we'd be handing
          // out fresh retries to a stream that keeps dying on arrival.
          const retriedAt = retriedAtRef.current;
          if (retriedAt != null && audio.currentTime > retriedAt + 3) {
            retriedAtRef.current = null;
          }
          store.getState().setProgress(audio.currentTime, audio.duration || 0);
        }}
        onPlay={() => store.getState().setPlaying(true)}
        onPause={() => {
          store.getState().setPlaying(false);
          store.getState().setStalled(false);
        }}
        onEnded={() => {
          store.getState().setPlaying(false);
          store.getState().setStalled(false);
        }}
        onWaiting={() => store.getState().setStalled(true)}
        onPlaying={() => store.getState().setStalled(false)}
        // A failed load fires `error`, never `pause`, so isPlaying would sit
        // true forever: the button reads Pause, every press silently retries,
        // and nothing on screen says why. Reset it and name the reason.
        onError={(e) => {
          const audio = e.currentTarget;
          const code = audio.error?.code;
          // The load was deliberately abandoned — our own teardown, or a
          // seek that outran it. Never worth a word.
          if (code === MediaError.MEDIA_ERR_ABORTED) return;
          // A dropped connection is the routine failure here: an uncached
          // song streams straight from the origin while the service worker
          // pulls the same file down in the background, so either can lose
          // the race on a flaky link. Reload once, quietly, before crying
          // wolf — the operator only needs to hear about it if it sticks.
          if (
            code === MediaError.MEDIA_ERR_NETWORK &&
            retriedAtRef.current == null &&
            audio.isConnected
          ) {
            const { time, isPlaying: was } = store.getState();
            retriedAtRef.current = time;
            resumeRef.current = { at: time, wasPlaying: was };
            store.getState().setStalled(true);
            audio.load();
            return;
          }
          retriedAtRef.current = null;
          resumeRef.current = null;
          store.getState().setPlaying(false);
          store.getState().setStalled(false);
          store.getState().resetProgress();
          toast.error(`Stream failed — ${mediaErrorText(audio.error)}.`);
        }}
      />

      {/* ── transport bar — pinned, so the playhead stays readable however far
          down the lyric list you are ── */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-border/60 border-b bg-background/95 px-4 py-3 backdrop-blur-xs sm:px-6">
        <TipButton
          tip={isPlaying ? "Pause (Space)" : "Play (Space)"}
          variant="action"
          size="icon-lg"
          onClick={press(togglePlay)}
        >
          {isPlaying ? (
            <Pause weight="fill" className="size-5" />
          ) : (
            <Play weight="fill" className="size-5" />
          )}
        </TipButton>
        <TipButton
          tip="Back 3s (←)"
          variant="ghost"
          size="icon"
          onClick={press(() => seek((audioRef.current?.currentTime ?? 0) - 3))}
        >
          <Rewind className="size-4" />
        </TipButton>
        <TipButton
          tip="Forward 3s (→)"
          variant="ghost"
          size="icon"
          onClick={press(() => seek((audioRef.current?.currentTime ?? 0) + 3))}
        >
          <FastForward className="size-4" />
        </TipButton>

        <Clock store={store} />
        {stalled && (
          <output className="shrink-0 text-muted-foreground text-xs">
            buffering…
          </output>
        )}
        <SeekBar store={store} onSeek={seek} />

        <div className="flex items-center gap-1">
          {RATES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={press(() => store.getState().setRate(r))}
              className={cn(
                "rounded-full px-2 py-1 text-xs tabular-nums transition-colors",
                r === rate
                  ? "bg-ocean-deep/15 font-medium text-ocean-deep dark:bg-turquoise/15 dark:text-turquoise"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {r}×
            </button>
          ))}
        </div>

        <label className="flex items-center gap-1.5 text-muted-foreground text-xs">
          offset
          <input
            type="number"
            step={50}
            value={offsetMs}
            onChange={(e) =>
              store.getState().setOffsetMs(Number(e.target.value) || 0)
            }
            aria-label="Tap offset in milliseconds"
            className="h-7 w-16 rounded-md border border-border/70 bg-card px-2 text-right tabular-nums outline-none focus:border-ocean dark:focus:border-sky-bright"
          />
          ms
        </label>
      </div>

      {/* ── song header + shortcut legend ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-4 sm:px-6">
        <h2
          lang={isJapanese(song.name) ? "ja" : undefined}
          className="font-display text-foreground text-lg"
        >
          {song.name}
        </h2>
        {song.album && (
          <span
            lang={isJapanese(song.album) ? "ja" : undefined}
            className="text-muted-foreground text-sm"
          >
            {song.album}
          </span>
        )}
        <span className="ml-auto tabular-nums text-muted-foreground text-sm">
          {timedCount}/{lines.length} timed
        </span>
      </div>
      <p className="px-4 pt-1 pb-2 text-muted-foreground text-xs sm:px-6">
        <Kbd>Space</Kbd> play · <Kbd>Enter</Kbd> stamp line & advance ·{" "}
        <Kbd>⌫</Kbd> undo · <Kbd>↑↓</Kbd> move cursor · <Kbd>←→</Kbd> seek 3s ·{" "}
        <Kbd>[ ]</Kbd> speed · <Kbd>I</Kbd> interlude at the playhead
      </p>

      <div className="flex flex-wrap items-center gap-2 px-4 pb-3 sm:px-6">
        <TipButton
          tip="Drop a 🎵 below the selected line, stamped at the playhead (I)"
          variant="action"
          size="sm"
          onClick={press(insertInterludeNow)}
        >
          <MusicNote weight="fill" className="size-4" /> Interlude here
        </TipButton>
        <TipButton
          tip="Same place, but leave it untimed"
          variant="outline"
          size="sm"
          onClick={press(insertInterlude)}
        >
          <MusicNote className="size-4" /> Untimed
        </TipButton>

        <div className="ml-auto flex items-center gap-1">
          <span className="mr-1 text-muted-foreground text-xs">
            Shift every stamp
          </span>
          {SHIFTS.map((d) => (
            <TipButton
              key={d}
              tip={`Move every timestamp ${
                d < 0 ? "earlier" : "later"
              } by ${Math.abs(d)}s`}
              variant="outline"
              size="xs"
              className="tabular-nums"
              disabled={timedCount === 0}
              onClick={press(() => shiftAll(d))}
            >
              {d > 0 ? `+${d}` : d}s
            </TipButton>
          ))}
        </div>
      </div>

      {/* ── the lines ── */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-40 sm:px-4">
        {loading ? (
          <p className="p-6 text-muted-foreground text-sm">Loading lyrics…</p>
        ) : loadError ? (
          <p className="p-6 text-muted-foreground text-sm">
            Couldn't load this song's lyrics.
          </p>
        ) : lines.length === 0 ? (
          <div className="flex flex-col items-start gap-3 p-6">
            <p className="text-muted-foreground text-sm">
              No lyrics on file. Add lines one at a time, or paste the whole
              lyric in “Edit text” below.
            </p>
            <Button variant="action" onClick={() => insertLineBelow(-1)}>
              <Plus className="size-4" /> Add a line
            </Button>
          </div>
        ) : (
          <ol>
            {lines.map((line, i) => {
              const isCursor = i === cursor;
              const isActive = i === activeIndex;
              return (
                <li
                  key={line.id}
                  ref={(el) => {
                    rowRefs.current[i] = el;
                  }}
                  className={cn(
                    "group flex items-center gap-2 rounded-xl px-2 py-1 transition-colors",
                    isCursor && "bg-ocean-deep/[0.08] dark:bg-turquoise/[0.1]",
                    !isCursor &&
                      isActive &&
                      "bg-coral-ink/[0.06] dark:bg-coral/[0.08]",
                  )}
                >
                  {/* timestamp — click seeks, double-click types a value */}
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          onClick={press(() => selectAndSeek(i))}
                          onDoubleClick={() => {
                            const entered = window.prompt(
                              "Timestamp (m:ss.cc or seconds), blank to clear:",
                              line.startTime != null ? tc(line.startTime) : "",
                            );
                            if (entered != null)
                              setLineTime(i, parseTime(entered));
                          }}
                          className={cn(
                            "w-16 shrink-0 rounded-md px-1 py-0.5 text-right font-mono text-xs tabular-nums transition-colors",
                            line.startTime == null
                              ? "text-muted-foreground/50"
                              : isCursor
                                ? "text-ocean-deep dark:text-turquoise"
                                : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {tc(line.startTime)}
                        </button>
                      }
                    />
                    <TooltipContent>
                      Click to seek · double-click to type
                    </TooltipContent>
                  </Tooltip>

                  {/* line text — inline editable */}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <input
                      ref={(el) => {
                        if (el) inputRefs.current.set(line.id, el);
                        else inputRefs.current.delete(line.id);
                      }}
                      value={line.origin}
                      onChange={(e) => setLineOrigin(i, e.target.value)}
                      onFocus={() => store.getState().selectLine(i)}
                      lang={isJapanese(line.origin) ? "ja" : undefined}
                      placeholder="(empty line)"
                      className={cn(
                        "w-full rounded-md bg-transparent px-1 py-0.5 text-[15px] leading-snug outline-none placeholder:text-muted-foreground/40 focus:bg-foreground/[0.04] dark:focus:bg-white/[0.06]",
                        isActive
                          ? "text-coral-ink dark:text-coral"
                          : "text-foreground/90",
                      )}
                    />
                    {(line.ja || line.en) && (
                      <p className="px-1 text-muted-foreground text-xs">
                        {line.ja && (
                          <span lang="ja" className="mr-2">
                            {line.ja}
                          </span>
                        )}
                        {line.en}
                      </p>
                    )}
                  </div>

                  {/* per-line controls (hover / cursor) */}
                  <div
                    className={cn(
                      "flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100",
                      isCursor && "opacity-100",
                    )}
                  >
                    <RowBtn
                      tip="Nudge earlier 0.1s"
                      onClick={() => nudge(i, -0.1)}
                    >
                      −
                    </RowBtn>
                    <RowBtn
                      tip="Nudge later 0.1s"
                      onClick={() => nudge(i, 0.1)}
                    >
                      +
                    </RowBtn>
                    <RowBtn
                      tip="Stamp this line at the playhead (on press)"
                      down
                      onClick={() => stampHere(i)}
                    >
                      <Crosshair className="size-3.5" />
                    </RowBtn>
                    <RowBtn
                      tip="Clear this line's time"
                      onClick={() => setLineTime(i, null)}
                    >
                      <Eraser className="size-3.5" />
                    </RowBtn>
                    <RowBtn
                      tip="Insert a line below"
                      onClick={() => insertLineBelow(i)}
                    >
                      <Plus className="size-3.5" />
                    </RowBtn>
                    <RowBtn
                      tip="Delete this line"
                      onClick={() => deleteLine(i)}
                    >
                      <Trash className="size-3.5" />
                    </RowBtn>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <TextEditor
          open={showText}
          onOpen={() => setShowText((v) => !v)}
          lines={lines}
          onApply={applyText}
        />
      </div>

      {/* ── save bar ── */}
      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-border/60 border-t bg-background/95 px-4 py-3 backdrop-blur-xs sm:px-6">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">State</span>
          <select
            value={state}
            onChange={(e) =>
              store.getState().setLyricsState(e.target.value as LyricsState)
            }
            className="h-9 rounded-md border border-border/70 bg-card px-2 text-foreground text-sm outline-none focus:border-ocean dark:focus:border-sky-bright"
          >
            {LYRICS_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <Button
          variant="ghost"
          onClick={press(undoStamp)}
          className="text-muted-foreground"
        >
          <ArrowUUpLeft className="size-4" /> Undo stamp
        </Button>

        {/* Hidden picker for Import; reset value so the same file re-fires. */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importFile(f);
            e.currentTarget.value = "";
          }}
        />
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadSimple className="size-4" /> Import
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={exportLyrics}
        >
          <DownloadSimple className="size-4" /> Export
        </Button>

        <span className="ml-auto text-muted-foreground text-xs">
          {dirty ? "Unsaved changes" : "Saved"}
        </span>
        <Button
          variant="cta"
          size="lg"
          // Only blocked while a save is in flight — a missing password stays
          // clickable and explains itself (handleSave toasts), rather than
          // sitting dead with no hint.
          disabled={saving}
          onClick={press(handleSave)}
        >
          <FloppyDisk weight="fill" className="size-4" />
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

/** Playhead clock — subscribes to the playhead alone, so only it re-renders
 *  on the ~4Hz timeupdate ticks. */
function Clock({ store }: { store: EditorStore }) {
  const time = useStore(store, (s) => s.time);
  const duration = useStore(store, (s) => s.duration);
  return (
    <span className="tabular-nums text-muted-foreground text-sm">
      {tc(time)}{" "}
      <span className="opacity-50">/ {formatDuration(duration)}</span>
    </span>
  );
}

/** Seek bar — the shared Scrubber, driven by the same playhead. */
function SeekBar({
  store,
  onSeek,
}: {
  store: EditorStore;
  onSeek: (t: number) => void;
}) {
  const time = useStore(store, (s) => s.time);
  const duration = useStore(store, (s) => s.duration);
  return (
    <Scrubber
      label="Seek"
      min={0}
      max={duration || 0}
      step={0.01}
      value={Math.min(time, duration || 0)}
      onValueChange={(v) => onSeek(Array.isArray(v) ? v[0] : v)}
      className="min-w-[8rem] flex-1"
    />
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground/80">
      {children}
    </kbd>
  );
}

/** Small icon control on a lyric row, with a tooltip. Blurs on activation so
 *  the tap shortcuts keep working afterwards. `down` fires on pointer-press
 *  instead of click — for the stamp control, so the captured time is the
 *  moment of the press, not the (later) release. */
function RowBtn({
  tip,
  onClick,
  down,
  children,
}: {
  tip: string;
  onClick: () => void;
  down?: boolean;
  children: React.ReactNode;
}) {
  const act = (e: React.SyntheticEvent<HTMLElement>) => {
    e.currentTarget.blur();
    onClick();
  };
  return (
    <TipButton
      tip={tip}
      variant="ghost"
      size="icon-sm"
      className="text-muted-foreground"
      {...(down
        ? {
            // preventDefault stops the focus + the trailing click, so the
            // action fires exactly once, at press time.
            onPointerDown: (e) => {
              e.preventDefault();
              act(e);
            },
          }
        : { onClick: act })}
    >
      {children}
    </TipButton>
  );
}

function TextEditor({
  open,
  onOpen,
  lines,
  onApply,
}: {
  open: boolean;
  onOpen: () => void;
  lines: EditLine[];
  onApply: (origin: string, ja: string, en: string) => void;
}) {
  const [origin, setOrigin] = useState("");
  const [ja, setJa] = useState("");
  const [en, setEn] = useState("");

  // Refill the drafts from the current lines each time the panel opens.
  useEffect(() => {
    if (!open) return;
    setOrigin(lines.map((l) => l.origin).join("\n"));
    setJa(lines.map((l) => l.ja).join("\n"));
    setEn(lines.map((l) => l.en).join("\n"));
  }, [open, lines]);

  return (
    <div className="mt-4 px-2 sm:px-0">
      <Button variant="link" onClick={onOpen} aria-expanded={open}>
        {open ? "Close text editor" : "Edit text / import lyrics"}
      </Button>

      {open && (
        <div className="mt-3 rounded-2xl border border-border/60 bg-card/60 p-4 shadow-postcard">
          <p className="mb-3 text-muted-foreground text-xs">
            One line per lyric line. Existing timestamps stay attached by row
            position, so you can fix a typo without re-tapping. Japanese reading
            and English are optional, aligned line-by-line.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Original" value={origin} onChange={setOrigin} ja />
            <Field label="Japanese reading" value={ja} onChange={setJa} ja />
            <Field label="English" value={en} onChange={setEn} />
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="action" onClick={() => onApply(origin, ja, en)}>
              Apply text
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  ja,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  ja?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        lang={ja ? "ja" : undefined}
        rows={12}
        spellCheck={false}
        className="min-h-40 resize-y rounded-xl border border-border/70 bg-background px-3 py-2 text-foreground text-sm leading-snug outline-none focus:border-ocean focus:ring-2 focus:ring-ocean/25 dark:focus:border-sky-bright"
      />
    </label>
  );
}
