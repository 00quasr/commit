import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "commit — show your work. see theirs.";
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
        background: "#faf8f4",
        backgroundImage:
          "radial-gradient(90% 70% at 50% -10%, rgba(216,240,94,0.5), transparent 70%)",
        color: "#16150f",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 20,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(22,21,15,0.46)",
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
          letterSpacing: "-0.04em",
          lineHeight: 1.04,
        }}
      >
        <div style={{ display: "flex" }}>Show your work.</div>
        <div style={{ display: "flex" }}>See theirs.</div>
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
            color: "rgba(22,21,15,0.7)",
          }}
        >
          A photo of the work, on the rhythm you set.
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 22,
            fontWeight: 500,
            padding: "10px 24px",
            borderRadius: 9999,
            background: "#16150f",
            color: "#faf8f4",
          }}
        >
          commit.app
        </div>
      </div>
    </div>,
    { ...size },
  );
}
