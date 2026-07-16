import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Navy monogram T on a transparent ground (site owner's call — no tile). Note:
// iOS composites transparent apple-touch icons onto black, so on an iOS home
// screen the navy T sits on black; the browser-tab favicon (icon.svg) is the
// transparent mark that reads correctly. Keep the T geometry in sync with icon.svg.
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
