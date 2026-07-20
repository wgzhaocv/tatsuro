"use client";

import { ArrowClockwise, Key, MusicNotesSimple } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  fetchLyricsStatus,
  type LyricsState,
  type StatusSong,
} from "@/lib/api/studio";
import { usePlayerStore } from "@/lib/player/store";
import { LyricEditor } from "./lyric-editor";
import { WorkQueue } from "./work-queue";

const PW_KEY = "tatsuro-lyrics-pw";

/**
 * Lyrics maintenance studio: a whole-catalogue work queue grouped by state on
 * the left, a listen-and-tap timestamp editor on the right. Unlisted admin
 * tool — the page is behind the site gate, and every write carries the separate
 * LYRICS_PASSWORD (held in this tab's sessionStorage, verified by the backend
 * on save). Nothing here touches the public player except to hush it on mount.
 */
export function LyricsStudio() {
  const [songs, setSongs] = useState<StatusSong[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const dirtyRef = useRef(false);

  // Silence the global player: if the visitor left a track playing before
  // typing /studio, the studio's own <audio> would play over it.
  useEffect(() => {
    usePlayerStore.getState().pause();
  }, []);

  useEffect(() => {
    setPassword(sessionStorage.getItem(PW_KEY) ?? "");
  }, []);

  const setAndStorePassword = useCallback((value: string) => {
    setPassword(value);
    sessionStorage.setItem(PW_KEY, value);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setSongs(await fetchLyricsStatus());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectSong = useCallback((id: string) => {
    if (dirtyRef.current) {
      const ok = window.confirm(
        "You have unsaved timing changes. Discard them and switch songs?",
      );
      if (!ok) return;
    }
    dirtyRef.current = false;
    setSelectedId(id);
  }, []);

  // Stable so the editor's capture-phase keydown listener isn't re-attached
  // on every parent render.
  const handleDirtyChange = useCallback((d: boolean) => {
    dirtyRef.current = d;
  }, []);

  // Reflect a save in the queue's grouping/counts without a full refetch.
  const handleSaved = useCallback((id: string, state: LyricsState) => {
    dirtyRef.current = false;
    setSongs((prev) =>
      prev ? prev.map((s) => (s.id === id ? { ...s, state } : s)) : prev,
    );
  }, []);

  const selected = songs?.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-3 border-border/60 border-b bg-background/90 px-4 py-3 backdrop-blur-xs sm:px-6">
        <div className="flex items-center gap-2">
          <MusicNotesSimple
            weight="fill"
            className="size-5 text-ocean-deep dark:text-turquoise"
            aria-hidden
          />
          <h1 className="font-display text-lg text-foreground">
            Lyrics Studio
          </h1>
        </div>

        <label className="ml-auto flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1.5 focus-within:border-ocean focus-within:ring-2 focus-within:ring-ocean/30 dark:focus-within:border-sky-bright">
          <Key className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            type="password"
            value={password}
            onChange={(e) => setAndStorePassword(e.target.value)}
            placeholder="Lyrics password"
            aria-label="Lyrics password (separate from the site gate)"
            autoComplete="off"
            className="h-6 w-40 min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[22rem_1fr]">
        <aside className="border-border/60 border-b lg:border-r lg:border-b-0">
          {loading ? (
            <p className="p-6 text-muted-foreground text-sm">Loading songs…</p>
          ) : error ? (
            <div className="flex flex-col items-start gap-3 p-6">
              <p className="text-muted-foreground text-sm">
                Couldn't reach the lyrics API.
              </p>
              <Button
                variant="ghost"
                onClick={load}
                className="text-ocean-deep dark:text-turquoise"
              >
                <ArrowClockwise className="size-4" aria-hidden />
                Retry
              </Button>
            </div>
          ) : songs ? (
            <WorkQueue
              songs={songs}
              selectedId={selectedId}
              onSelect={selectSong}
              onRefresh={load}
            />
          ) : null}
        </aside>

        <main className="min-w-0">
          {selected ? (
            <LyricEditor
              key={selected.id}
              song={selected}
              password={password}
              onDirtyChange={handleDirtyChange}
              onSaved={handleSaved}
            />
          ) : (
            <div className="grid h-full min-h-[50vh] place-items-center p-10 text-center">
              <p className="max-w-sm text-muted-foreground text-sm">
                Pick a song from the queue to listen and tap in its timestamps.
                Press{" "}
                <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  Space
                </kbd>{" "}
                to play,{" "}
                <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  Enter
                </kbd>{" "}
                to stamp each line.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
