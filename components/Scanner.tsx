"use client";

import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

type Props = {
  active: boolean;
  onDecode: (text: string) => void;
  onError?: (msg: string) => void;
};

/**
 * Thin wrapper over html5-qrcode. Mounts the camera into #reader while `active`,
 * stops it cleanly on unmount or when `active` flips to false.
 */
export default function Scanner({ active, onDecode, onError }: Props) {
  const ref = useRef<Html5Qrcode | null>(null);
  const decodeRef = useRef(onDecode);
  decodeRef.current = onDecode;

  useEffect(() => {
    if (!active) return;
    const qr = new Html5Qrcode("reader", { verbose: false });
    ref.current = qr;
    let stopped = false;

    qr.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: (w, h) => { const s = Math.floor(Math.min(w, h) * 0.75); return { width: s, height: s }; } },
      (text) => decodeRef.current(text),
      () => { /* per-frame miss, ignore */ },
    ).catch((err) => {
      onError?.(String(err?.message ?? err));
    });

    return () => {
      if (stopped) return;
      stopped = true;
      const q = ref.current;
      ref.current = null;
      if (q && q.isScanning) q.stop().then(() => q.clear()).catch(() => {});
      else q?.clear();
    };
  }, [active, onError]);

  return <div id="reader" />;
}
