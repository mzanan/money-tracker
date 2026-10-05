import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { OG_PALETTE as C } from "@/lib/ogPalette";
import { OG_IMAGE, SITE_NAME } from "@/lib/seo";

export const alt = OG_IMAGE.alt;
export const size = { width: OG_IMAGE.width, height: OG_IMAGE.height };
export const contentType = "image/png";

const ROWS = [
  { label: "Pho in Da Nang", local: "VND 65,000", base: "$2.56" },
  { label: "Coworking day pass", local: "THB 350", base: "$10.40" },
  { label: "Flight to Bangkok", local: "EUR 120.00", base: "$130.20" },
];

export default async function OpengraphImage() {
  const icon = await readFile(join(process.cwd(), "public/icon.svg"));
  const iconSrc = `data:image/svg+xml;base64,${icon.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 72,
        background: `radial-gradient(circle at 15% 10%, ${C.glow}, ${C.background} 55%)`,
        color: C.foreground,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 28, width: 560 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src={iconSrc} width={56} height={56} alt="" style={{ borderRadius: 14 }} />
          <div style={{ fontSize: 30, fontWeight: 600 }}>{SITE_NAME}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 60, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
          <span>Your money across</span>
          <span style={{ color: C.brand }}>currencies, in one place.</span>
        </div>
        <div style={{ fontSize: 26, color: C.muted, lineHeight: 1.4 }}>
          Every expense keeps the exchange rate of its day.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          width: 420,
          padding: 28,
          borderRadius: 28,
          background: C.card,
          border: `1px solid ${C.border}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: C.muted }}>
          <span>Spent this month</span>
          <span>USD</span>
        </div>
        <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: -1 }}>$143.16</div>
        {ROWS.map((row) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 0",
              borderTop: `1px solid ${C.border}`,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 20 }}>{row.label}</span>
              <span style={{ fontSize: 17, color: C.muted }}>{row.local}</span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 600 }}>{row.base}</span>
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
