import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon: white monogram T on a deep-navy tile (matches the favicon's
// dark-tab state). iOS renders transparency black, so this one gets an opaque
// ground — a restrained navy #0B3A53, not the saturated block we rejected.
// Keep the T geometry in sync with icon.svg.
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: "#0B3A53",
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
