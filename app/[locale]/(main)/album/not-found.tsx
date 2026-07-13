import { AlbumNotFoundContent } from "./not-found-content";

/**
 * Themed 404 for unknown releases/editions. Renders inside the album layout
 * (back pill + theme toggle) on the base sea-sky gradient; plain, functional
 * copy — the full empty-state pass is roadmap #9. The translated copy lives in
 * a client child because not-found.tsx can't read params/locale.
 */
export default function AlbumNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-24 text-center">
      <AlbumNotFoundContent />
    </div>
  );
}
