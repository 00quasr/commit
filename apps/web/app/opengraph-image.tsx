import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "commit — the drop is the proof";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "80px",
        background: "#050505",
        color: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 20,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.48)",
        }}
      >
        Beta · Invite-only
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          fontSize: 112,
          fontWeight: 500,
          letterSpacing: "-0.035em",
          lineHeight: 1.04,
        }}
      >
        <div style={{ display: "flex" }}>Stop drifting.</div>
        <div style={{ display: "flex" }}>Start finishing.</div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            maxWidth: 720,
            lineHeight: 1.4,
            color: "rgba(255,255,255,0.72)",
          }}
        >
          Strava + BeReal for any goal worth committing to.
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: "0.04em",
            color: "rgba(255,255,255,0.48)",
          }}
        >
          commit.app
        </div>
      </div>
    </div>,
    { ...size },
  );
}
