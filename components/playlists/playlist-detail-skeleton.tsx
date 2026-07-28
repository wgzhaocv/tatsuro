/**
 * The loading shape shared by the playlist detail screen and the shared-playlist
 * viewer. Deliberately its own module with no `"use client"`: as a route's
 * Suspense fallback it is imported by the server component, and importing it
 * from playlist-detail.tsx instead would drag that file's whole client subgraph
 * (share menu, account store, offline switch) into the first load of a page that
 * never renders any of it — worst on a shared link, where the visitor is cold.
 *
 * Mirrors PlaylistDetail's grid so the skeleton doesn't shift on swap.
 */
export function PlaylistDetailSkeleton() {
  return (
    <div className="relative z-10 flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8 sm:pb-5 sm:pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="h-11 w-32 animate-pulse rounded-full bg-white/20" />
        <div className="size-11 animate-pulse rounded-full bg-white/20" />
      </header>
      <div className="mx-auto w-full max-w-6xl px-5 pt-2 pb-20 sm:px-8 lg:grid lg:grid-cols-[18.5rem_1fr] lg:items-start lg:gap-12 lg:pt-6">
        <aside className="grid grid-cols-[8rem_1fr] items-center gap-x-5 sm:grid-cols-[14rem_1fr] sm:gap-x-7 lg:flex lg:flex-col lg:items-start">
          <div className="aspect-square w-full animate-pulse rounded-[14px] bg-white/20 shadow-postcard sm:rounded-[20px]" />
          <div className="flex min-w-0 flex-col items-start gap-3 lg:mt-6 lg:w-full">
            <div className="h-8 w-40 animate-pulse rounded-md bg-white/20 sm:h-10 sm:w-56" />
            <div className="h-4 w-28 animate-pulse rounded bg-white/20" />
            <div className="mt-2 h-11 w-32 animate-pulse rounded-full bg-white/20" />
          </div>
        </aside>
        <ol className="mt-8 flex flex-col gap-1 lg:mt-0">
          {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
            <li key={k} className="flex items-center gap-3 px-3 py-2">
              <div className="size-11 shrink-0 animate-pulse rounded-md bg-white/20" />
              <div className="flex min-w-0 grow flex-col gap-1.5">
                <div className="h-3.5 w-1/2 animate-pulse rounded bg-white/20" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-white/20" />
              </div>
              <div className="h-3 w-10 animate-pulse rounded bg-white/20" />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
