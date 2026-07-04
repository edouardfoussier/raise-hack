import { ImageResponse } from "next/og";

import { getProjectById, getVideoById, getVideoByShareId } from "@/lib/mock-data";
import { formatCompactNumber, formatDuration } from "@/lib/format";

export const alt = "A deterministic product demo generated with Scenario";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ACCENT = "#ff5a1f";
const BG = "#0b0d10";
const TEXT = "#f4f7f7";
const MUTED = "#9aa6ad";
const CHIP_BORDER = "rgba(255,255,255,0.12)";
const CHIP_BG = "rgba(255,255,255,0.05)";

type Props = { params: Promise<{ id: string }> };

export default async function OpengraphImage({ params }: Props) {
  const { id } = await params;
  const video = getVideoByShareId(id) ?? getVideoById(id);
  const project = video ? getProjectById(video.projectId) : undefined;

  const title = video?.title ?? "Shared product demo";
  const subtitle = video
    ? `${project ? `${project.name} · ` : ""}${formatDuration(
        video.durationSec,
      )} deterministic demo`
    : "Deterministic demo videos of your web app";

  const chips: string[] = [];
  if (video) {
    chips.push(`${formatDuration(video.durationSec)} runtime`);
    if (video.hasCaptions) chips.push("Captions");
    if (video.hasVoiceover) chips.push("Voice-over");
    chips.push(`${formatCompactNumber(video.analytics.views)} views`);
  } else {
    chips.push("Captions", "Voice-over", "Share analytics");
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: BG,
          backgroundImage:
            "radial-gradient(900px 520px at 12% -12%, rgba(255,90,31,0.30), transparent 60%), radial-gradient(760px 520px at 112% 120%, rgba(255,90,31,0.12), transparent 55%)",
          color: TEXT,
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand lockup */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 18,
              background: ACCENT,
              boxShadow: "0 0 44px rgba(255,90,31,0.55)",
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24">
              <path d="M9 7.5v9l7-4.5-7-4.5Z" fill="#04110f" />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 36, fontWeight: 600 }}>
            Scenario
          </div>
        </div>

        {/* Title block */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", marginBottom: 28 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 18px",
                borderRadius: 999,
                border: `1px solid ${CHIP_BORDER}`,
                background: CHIP_BG,
                fontSize: 22,
                color: "#c7d0d4",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: ACCENT,
                }}
              />
              Deterministic product demo
            </div>
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontSize: 30,
              color: MUTED,
            }}
          >
            {subtitle}
          </div>
        </div>

        {/* Chips + tagline */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {chips.map((chip) => (
              <div
                key={chip}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 18px",
                  borderRadius: 14,
                  border: `1px solid ${CHIP_BORDER}`,
                  background: CHIP_BG,
                  fontSize: 24,
                  color: "#dfe6e8",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: ACCENT,
                  }}
                />
                {chip}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", fontSize: 24, color: "#8b969c" }}>
            Ship the demo, not just the code.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
