import { ImageResponse } from "next/og";

export const alt = "FunnelScout";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        background: "#0c0a09",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 72,
          fontWeight: 700,
          color: "#fafaf9",
          letterSpacing: "-0.04em",
        }}
      >
        FunnelScout
      </div>
      <div style={{ fontSize: 28, color: "#a8a29e", marginTop: 16 }}>
        Pipeline intelligence for GHL agencies
      </div>
    </div>,
    { ...size },
  );
}
