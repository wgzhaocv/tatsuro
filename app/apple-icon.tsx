import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon: navy monogram T on a white tile — the light-mode mark (site
// owner's call; no dark/navy-tile variant). iOS renders transparency black, so
// this one gets an opaque white ground. Keep the T geometry in sync with icon.svg.
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: "#FFFFFF",
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
          background: "#0B3A53",
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
          background: "#0B3A53",
        }}
      />
    </div>,
    { ...size },
  );
}
