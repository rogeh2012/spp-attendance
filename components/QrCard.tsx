"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

const SCHOOL = "School of Praise & Prayer";

type Props = { name: string; token: string; size?: number };

/** Renders the QR into a canvas. Used by the print sheet and the student QR sheet. */
export default function QrCard({ name, token, size = 240 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(ref.current, token, { width: size, margin: 1, errorCorrectionLevel: "M" });
  }, [token, size]);
  return (
    <div className="card">
      <div className="cschool">{SCHOOL}</div>
      <canvas ref={ref} aria-label={`QR code for ${name}`} />
      <div className="cname">{name}</div>
      <div className="ctoken">{token}</div>
    </div>
  );
}

/**
 * Builds a WhatsApp-friendly PNG (900×1100): QR + name, and triggers a download.
 * Canvas text rendering handles Arabic shaping natively in the browser.
 */
export async function downloadPng(name: string, token: string) {
  const W = 900, H = 1100;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#5c5870";
  ctx.font = "600 34px Onest, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(SCHOOL, W / 2, 90);

  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, token, { width: 640, margin: 1, errorCorrectionLevel: "M" });
  ctx.drawImage(qr, (W - 640) / 2, 130);

  ctx.fillStyle = "#1f1b2e";
  ctx.font = "800 64px Onest, system-ui, sans-serif";
  // shrink long names to fit
  let f = 64;
  while (ctx.measureText(name).width > W - 100 && f > 30) { f -= 4; ctx.font = `800 ${f}px Onest, system-ui, sans-serif`; }
  ctx.fillText(name, W / 2, 880);

  ctx.fillStyle = "#5c5870";
  ctx.font = "500 30px Onest, system-ui, monospace";
  ctx.fillText(token, W / 2, 950);

  const a = document.createElement("a");
  a.href = c.toDataURL("image/png");
  a.download = `${name.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || token}.png`;
  a.click();
}
