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
import { create } from "zustand";
import { Scrubber } from "@/components/player/scrubber";
import { Button } from "@/components/ui/button";
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
import { TipButton } from "./tip-button";

// A line while it's being timed. startTime null = not yet stamped (serialized
// as 0). Ids are internal, for stable React keys through text edits.
type EditLine = {
  id: number;
  origin: string;
  ja: string;
  en: string;
  startTime: number | null;
};

const emptyLine = (id: number): EditLine => ({
  id,
  origin: "",
  ja: "",
  en: "",
  startTime: null,
});

// Playback position lives in its own store so ~4Hz timeupdate ticks re-render
// only the leaf readouts that subscribe (the clock + seek bar), not the whole
// editor and its line list — mirrors the player's useProgressStore split.
const useStudioTime = create<{
  time: number;
  duration: number;
  set: (time: number, duration: number) => void;
}>((set) => ({
  time: 0,
  duration: 0,
  set: (time, duration) => set({ time, duration }),
}));

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

/** The line currently sounding (for a karaoke highlight): the last stamped line
 *  at or before `time`. Unlike currentLineIndex in lib/api/lyrics, this skips
 *  not-yet-stamped lines, so it works mid-timing. */
function activeLineIndex(lines: EditLine[], time: number): number {
  let active = -1;
  for (let i = 0; i < lines.length; i++) {
    const st = lines[i].startTime;
    if (st == null) continue;
    if (st <= time + 0.001) active = i;
    else break;
  }
  return active;
}

const RATES = [0.5, 0.75, 1, 1.25, 1.5];

// The content of an interlude/instrumental-break line — a bare note emoji.
const INTERLUDE = "🎵";

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
  const audioRef = useRef<HTMLAudioElement>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const inputRefs = useRef(new Map<number, HTMLInputElement>());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [lines, setLines] = useState<EditLine[]>([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  // A line id to focus once rendered (a freshly inserted row).
  const [focusId, setFocusId] = useState<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  // Default tap latency compensation: you hear a line, then react, so the
  // press lands ~0.3s late — stamp that much earlier. Adjustable.
  const [offsetMs, setOffsetMs] = useState(300);

  const [state, setState] = useState<LyricsState>(song.state);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showText, setShowText] = useState(false);

  // Monotonic id source for new lines (reset per song — the editor remounts on
  // key={song.id}).
  const idRef = useRef(0);
  const newId = useCallback(() => idRef.current++, []);

  // Live refs for the keydown handler (attached once, must not go stale).
  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const offsetRef = useRef(offsetMs);
  offsetRef.current = offsetMs;

  // Only when activeIndex crosses a boundary does the editor re-render — ticks
  // in between move the clock/seek-bar leaves, not this component.
  const activeIndex = useStudioTime((s) => activeLineIndex(lines, s.time));

  const markDirty = useCallback(() => {
    setDirty(true);
    onDirtyChange(true);
  }, [onDirtyChange]);

  // ── load lyrics + point the audio element at the stream ──
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    useStudioTime.getState().set(0, 0);
    fetchLyrics(song.id)
      .then((fetched) => {
        if (cancelled) return;
        const mapped: EditLine[] = fetched.map((l) => ({
          id: newId(),
          origin: l.origin,
          ja: l.ja ?? "",
          en: l.en ?? "",
          startTime: l.startTime > 0 ? l.startTime : null,
        }));
        setLines(mapped);
        const firstUnstamped = mapped.findIndex((l) => l.startTime == null);
        setCursor(firstUnstamped >= 0 ? firstUnstamped : 0);
      })
      .catch(() => !cancelled && setLoadError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [song.id, newId]);

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
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, []);

  const seek = useCallback((t: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const max = audio.duration || Number.POSITIVE_INFINITY;
    audio.currentTime = Math.min(Math.max(0, t), max);
  }, []);

  const bumpRate = useCallback((dir: number) => {
    setRate((r) => {
      const i = RATES.indexOf(r) + dir;
      return RATES[Math.min(RATES.length - 1, Math.max(0, i))] ?? r;
    });
  }, []);

  // Return focus to the body after a click so Space/arrows reach the global
  // keydown handler instead of re-triggering the button.
  const press = useCallback(
    (fn: () => void) => (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.blur();
      fn();
    },
    [],
  );

  // ── stamping ──
  const stampCursor = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const i = cursorRef.current;
    const t = Math.max(0, audio.currentTime - offsetRef.current / 1000);
    setLines((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, startTime: t } : l)),
    );
    setCursor((c) => Math.min(c + 1, Math.max(linesRef.current.length - 1, 0)));
    markDirty();
  }, [markDirty]);

  const undoStamp = useCallback(() => {
    // Undo removes the *last* stamp, which always sits at cursor-1 (stamping
    // advances the cursor). At the top there's nothing to undo — a no-op, so
    // Backspace can't nuke line 0 or fake a dirty state on an empty song.
    if (cursorRef.current <= 0) return;
    const back = cursorRef.current - 1;
    const prevStamp = linesRef.current[back - 1]?.startTime ?? null;
    seek(prevStamp ?? 0);
    setCursor(back);
    setLines((prev) =>
      prev.map((l, i) => (i === back ? { ...l, startTime: null } : l)),
    );
    markDirty();
  }, [markDirty, seek]);

  const setLineTime = useCallback(
    (index: number, value: number | null) => {
      setLines((prev) =>
        prev.map((l, i) => (i === index ? { ...l, startTime: value } : l)),
      );
      markDirty();
    },
    [markDirty],
  );

  const setLineOrigin = useCallback(
    (index: number, value: string) => {
      setLines((prev) =>
        prev.map((l, i) => (i === index ? { ...l, origin: value } : l)),
      );
      markDirty();
    },
    [markDirty],
  );

  const nudge = useCallback(
    (index: number, delta: number) => {
      setLines((prev) =>
        prev.map((l, i) =>
          i === index
            ? { ...l, startTime: Math.max(0, (l.startTime ?? 0) + delta) }
            : l,
        ),
      );
      markDirty();
    },
    [markDirty],
  );

  const stampHere = useCallback(
    (index: number) =>
      setLineTime(
        index,
        Math.max(
          0,
          (audioRef.current?.currentTime ?? 0) - offsetRef.current / 1000,
        ),
      ),
    [setLineTime],
  );

  // Insert a line after `index` (−1 to prepend) and select it. A blank line
  // focuses its field for immediate typing; a pre-filled one (interlude) just
  // waits to be timed.
  const insertLineBelow = useCallback(
    (index: number, content = "") => {
      const id = newId();
      const at = index + 1;
      setLines((prev) => [
        ...prev.slice(0, at),
        { ...emptyLine(id), origin: content },
        ...prev.slice(at),
      ]);
      // Clamp into the grown list (at can exceed the last index when the list
      // was empty or `index` pointed at the end).
      setCursor(Math.min(at, linesRef.current.length));
      if (!content) setFocusId(id);
      markDirty();
    },
    [markDirty, newId],
  );

  const insertInterlude = useCallback(
    () => insertLineBelow(cursorRef.current, INTERLUDE),
    [insertLineBelow],
  );

  const deleteLine = useCallback(
    (index: number) => {
      setLines((prev) => prev.filter((_, i) => i !== index));
      setCursor((c) => Math.min(c, Math.max(linesRef.current.length - 2, 0)));
      markDirty();
    },
    [markDirty],
  );

  const selectAndSeek = useCallback(
    (index: number) => {
      setCursor(index);
      const st = linesRef.current[index]?.startTime;
      if (st != null) seek(st);
    },
    [seek],
  );

  const moveCursor = useCallback((delta: number) => {
    setCursor((c) =>
      Math.min(
        Math.max(0, c + delta),
        Math.max(linesRef.current.length - 1, 0),
      ),
    );
  }, []);

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
  }, [togglePlay, stampCursor, undoStamp, moveCursor, seek, bumpRate]);

  // Keep the cursor line in view as it advances.
  useEffect(() => {
    rowRefs.current[cursor]?.scrollIntoView({ block: "center" });
  }, [cursor]);

  // Focus a freshly inserted line's text field, once it has rendered.
  useEffect(() => {
    if (focusId == null) return;
    inputRefs.current.get(focusId)?.focus();
    setFocusId(null);
  }, [focusId]);

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
      setState(settled);
      setDirty(false);
      onDirtyChange(false);
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
  }, [password, song.id, lines, state, onSaved, onDirtyChange]);

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
          setLines(next);
          setCursor(0);
          markDirty();
          toast.success(`Imported ${next.length} lines — review and save.`);
        } catch {
          toast.error(
            "Couldn't read that file — expected exported lyrics JSON.",
          );
        }
      };
      reader.readAsText(file);
    },
    [markDirty, newId],
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
      const prev = linesRef.current;
      // Preserve id + timing by row position so fixing a typo doesn't re-time.
      const next: EditLine[] = o.map((line, i) => ({
        id: prev[i]?.id ?? newId(),
        origin: line,
        ja: (j[i] ?? "").trim(),
        en: (e[i] ?? "").trim(),
        startTime: prev[i]?.startTime ?? null,
      }));
      setLines(next);
      setCursor(0);
      setShowText(false);
      markDirty();
    },
    [markDirty, newId],
  );

  return (
    <div className="flex h-full flex-col">
      {/* biome-ignore lint/a11y/useMediaCaption: admin scrubbing tool, no captions */}
      <audio
        ref={audioRef}
        src={songStreamUrl(song.id)}
        preload="metadata"
        onLoadedMetadata={(e) =>
          useStudioTime.getState().set(0, e.currentTarget.duration || 0)
        }
        onTimeUpdate={(e) =>
          useStudioTime
            .getState()
            .set(e.currentTarget.currentTime, e.currentTarget.duration || 0)
        }
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      {/* ── transport bar ── */}
      <div className="flex flex-wrap items-center gap-3 border-border/60 border-b px-4 py-3 sm:px-6">
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

        <Clock />
        <SeekBar onSeek={seek} />

        <div className="flex items-center gap-1">
          {RATES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={press(() => setRate(r))}
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
            onChange={(e) => setOffsetMs(Number(e.target.value) || 0)}
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
        <Kbd>[ ]</Kbd> speed
      </p>

      <div className="flex flex-wrap items-center gap-2 px-4 pb-3 sm:px-6">
        <TipButton
          tip="Insert an interlude line (🎵) below the cursor"
          variant="outline"
          size="sm"
          onClick={press(insertInterlude)}
        >
          <MusicNote className="size-4" /> Interlude
        </TipButton>
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
                      onFocus={() => setCursor(i)}
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
            onChange={(e) => {
              setState(e.target.value as LyricsState);
              markDirty();
            }}
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

/** Playhead clock — subscribes to the time store so only it ticks at ~4Hz. */
function Clock() {
  const time = useStudioTime((s) => s.time);
  const duration = useStudioTime((s) => s.duration);
  return (
    <span className="tabular-nums text-muted-foreground text-sm">
      {tc(time)}{" "}
      <span className="opacity-50">/ {formatDuration(duration)}</span>
    </span>
  );
}

/** Seek bar — the shared Scrubber, driven by the time store. */
function SeekBar({ onSeek }: { onSeek: (t: number) => void }) {
  const time = useStudioTime((s) => s.time);
  const duration = useStudioTime((s) => s.duration);
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
