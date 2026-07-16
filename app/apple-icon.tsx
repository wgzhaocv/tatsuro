import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// White monogram T on a transparent ground — no tile. A single PNG can't follow
// the system theme, but iOS composites transparent apple-touch icons onto black,
// so a white T reads correctly there (matches the favicon's dark-tab state). The
// theme-adaptive navy/white mark lives in icon.svg. Keep the T geometry in sync.
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: "transparent",
      }}
    >
      {/* horizontal bar */}
      <div
        style={{
          position: "absolute",
          left: 39,
          top: 31,
          width: 102,
          height: 29,
          background: "#FFFFFF",
        }}
      />
      {/* vertical stem */}
      <div
        style={{
          position: "absolute",
          left: 75,
          top: 31,
          width: 30,
          height: 118,
          background: "#FFFFFF",
        }}
      />
    </div>,
    { ...size },
  );
}
