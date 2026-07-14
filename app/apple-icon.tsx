import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon: the sky→ocean gradient T on a sea-glass ground. Unlike the
// favicon it needs an opaque fill — iOS renders transparent areas black — so
// this is the one place the monogram sits on a tile (a pale, premium one, not
// the saturated block we rejected). Keep the T in sync with icon.svg.
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: "#E9F7F2",
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
          background: "linear-gradient(180deg, #4BC5DE, #0A8473)",
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
          background: "linear-gradient(180deg, #29AECB, #0A8473)",
        }}
      />
    </div>,
    { ...size },
  );
}
