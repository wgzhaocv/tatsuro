import { Suspense } from "react";
import { AccountBootstrap } from "@/components/account/account-bootstrap";
import { BottomNav } from "@/components/bottom-nav";
import { PinsHydration } from "@/components/pins/pins-hydration";
import { PlayerDock } from "@/components/player/player-dock";
import { PlaylistsHydration } from "@/components/playlists/hydration";

/**
 * Everything inside the app (not gate/demo) shares the player UI: the
 * persistent mini bar and the full-screen player it expands into. Pages render
 * above; the dock reserves its own space at the bottom while a queue is loaded.
 * On phone/tablet the BottomNav carries the section switcher the desktop top
 * bar hides below `lg`.
 *
 * The hidden AudioEngine deliberately lives in the ROOT layout, above the
 * `[locale]` segment — a locale switch remounts this whole subtree, and a
 * remounted <audio> element left playing while its replacement autostarts is
 * exactly the double-audio bug. Kept above `[locale]`, playback is one
 * uninterrupted element across language changes.
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
      {/* BottomNav reads the pathname (usePathname) to mark the active tab —
          dynamic under Cache Components. A Suspense boundary lets it stream as a
          hole on non-enumerated routes (e.g. /playlists/[id]) while enumerated
          pages still prerender it. */}
      <Suspense>
        <BottomNav />
      </Suspense>
      <PlaylistsHydration />
      <PinsHydration />
      <AccountBootstrap />
    </>
  );
}
