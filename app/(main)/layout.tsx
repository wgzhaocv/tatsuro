import { AudioEngine } from "@/components/player/audio-engine";
import { PlayerDock } from "@/components/player/player-dock";

/**
 * Everything inside the app (not gate/demo) shares the player: the hidden
 * audio engine, the persistent mini bar, and the full-screen player it
 * expands into. Pages render above; the dock reserves its own space at the
 * bottom while a queue is loaded.
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <PlayerDock />
      <AudioEngine />
    </>
  );
}
