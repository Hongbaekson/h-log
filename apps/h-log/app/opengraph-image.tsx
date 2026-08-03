import { ImageResponse } from "next/og";

export const alt = "백엔드 개발자 손홍백 포트폴리오";
export const contentType = "image/png";
export const size = {
  height: 630,
  width: 1200,
};

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "flex-start",
        background: "#080d18",
        color: "white",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "center",
        padding: "88px",
        width: "100%",
      }}
    >
      <div style={{ color: "#67e8f9", display: "flex", fontSize: 30 }}>
        Backend Developer · AI Workflow
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 78,
          fontWeight: 800,
          letterSpacing: "-0.04em",
          marginTop: 28,
        }}
      >
        Hongbaek Son Portfolio
      </div>
      <div
        style={{
          color: "#cbd5e1",
          display: "flex",
          fontSize: 32,
          marginTop: 30,
        }}
      >
        Reliable Backend Systems and Safe AI Workflows
      </div>
    </div>,
    size,
  );
}
