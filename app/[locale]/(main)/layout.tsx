import { Suspense } from "react";
import { AccountBootstrap } from "@/components/account/account-bootstrap";
import { BottomNav, BottomNavShell } from "@/components/bottom-nav";
import { DownloadsHydration } from "@/components/downloads/downloads-hydration";
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
      {/* Only the active-tab highlight needs the pathname (a dynamic API under
          Cache Components). The fallback renders the full bar with nothing lit,
          so it prerenders into the static shell and is in the first paint;
          BottomNav then resolves and lights the current tab. The bar never pops
          in — only its highlight arrives late. */}
      <Suspense fallback={<BottomNavShell activePath={null} />}>
        <BottomNav />
      </Suspense>
      <PlaylistsHydration />
      <PinsHydration />
      <DownloadsHydration />
      <AccountBootstrap />
    </>
  );
}
