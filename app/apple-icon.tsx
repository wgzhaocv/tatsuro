import { renderTile } from "./icons/tile";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS home-screen icon = the exact maskable tile (white slender T on a dusk-navy
// ground, #12263A). Sharing renderTile keeps all three marks — this, the
// manifest maskable PNGs, and icon.svg — in one geometry. iOS rounds the corners
// itself; the T lives inside renderTile's safe zone so nothing clips.
export default function AppleIcon() {
  return renderTile(180);
}
