"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Shell from "@/components/Shell";
import ManualEntry from "@/components/ManualEntry";
import { supabase, type ScanResult } from "@/lib/supabase";
import { cairoToday, cairoTime, prettyDate, sessionsForToday } from "@/lib/time";

const Scanner = dynamic(() => import("@/components/Scanner"), { ssr: false });

type Recent = { name: string; at: string; status: ScanResult["status"] };

const LABEL: Record<ScanResult["status"], string> = {
  recorded: "Recorded",
  duplicate: "Already recorded for this session",
  unknown: "Unknown QR code",
};
const TONE: Record<ScanResult["status"], string> = { recorded: "ok", duplicate: "warn", unknown: "bad" };

export default function ScanPage() {
  const [sessionNo, setSessionNo] = useState<1 | 2>(1);
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [flash, setFlash] = useState<ScanResult | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const busy = useRef(false);
  const lastToken = useRef<{ t: string; at: number }>({ t: "", at: 0 });
  const today = cairoToday();
  const sessions = sessionsForToday();

  const refreshCount = useCallback(async () => {
    const { count } = await supabase()
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("session_date", today)
      .eq("session_no", sessionNo);
    setTodayCount(count ?? 0);
  }, [today, sessionNo]);

  useEffect(() => { refreshCount(); }, [refreshCount]);

  /** Flash, recent list, count and haptics — shared by the camera and by manual entry. */
  const applyResult = useCallback((res: ScanResult) => {
    setFlash(res);
    if (res.status !== "unknown" && res.student_name) {
      setRecent((r) => [{ name: res.student_name!, at: res.scanned_at ?? new Date().toISOString(), status: res.status }, ...r].slice(0, 30));
    }
    if (res.status === "recorded") setTodayCount((c) => (c ?? 0) + 1);
    if (navigator.vibrate) navigator.vibrate(res.status === "recorded" ? 80 : [60, 60, 60]);

    window.setTimeout(() => { setFlash(null); busy.current = false; }, res.status === "recorded" ? 1400 : 2000);
  }, []);

  const handleDecode = useCallback(async (text: string) => {
    const now = Date.now();
    // ignore the same code re-read within 3s (camera keeps seeing it while the phone is held up)
    if (busy.current || (lastToken.current.t === text && now - lastToken.current.at < 3000)) return;
    busy.current = true;
    lastToken.current = { t: text, at: now };

    const { data, error } = await supabase().rpc("record_scan", {
      p_token: text.trim(),
      p_session_date: today,
      p_session_no: sessionNo,
    });

    applyResult(error
      ? { status: "unknown", student_name: null, scanned_at: null }
      : (data as ScanResult));
  }, [today, sessionNo, applyResult]);

  const onCamError = useCallback((msg: string) => {
    setScanning(false);
    setCamError(msg.includes("NotAllowed") ? "Camera permission was denied. Allow camera access for this site and try again."
      : msg.includes("NotFound") ? "No camera found on this device."
      : `Camera could not start: ${msg}`);
  }, []);

  return (
    <Shell>
      <div className="stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700 }}>{prettyDate(today)}</div>
            <div className="muted">Cairo time</div>
          </div>
          <div className="count" style={{ textAlign: "right" }}>
            {todayCount ?? "–"}<small>present · session {sessionNo}</small>
          </div>
        </div>

        <div className="session" role="group" aria-label="Session"
          style={sessions.length === 1 ? { gridTemplateColumns: "1fr" } : undefined}>
          {sessions.map((n) => (
            <button key={n} aria-pressed={sessionNo === n} disabled={scanning}
              onClick={() => setSessionNo(n)}>
              Session {n}<span>{sessions.length === 1 ? "Friday · one session" : n === 1 ? "first scan of the day" : "second scan of the day"}</span>
            </button>
          ))}
        </div>

        <div className="scanbox">
          {scanning ? <Scanner active={scanning} onDecode={handleDecode} onError={onCamError} /> : (
            <div className="idle">
              <div>
                <p style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700 }}>Session {sessionNo} · {prettyDate(today)}</p>
                <p style={{ margin: 0, opacity: .7 }}>Camera is off</p>
              </div>
            </div>
          )}
          {flash && (
            <div className={`result ${TONE[flash.status]}`} role="status" aria-live="assertive">
              <div className="name">{flash.student_name ?? "Not a student code"}</div>
              <div className="what">{LABEL[flash.status]}{flash.scanned_at ? ` · ${cairoTime(flash.scanned_at)}` : ""}</div>
            </div>
          )}
        </div>

        {camError && <p className="error" role="alert">{camError}</p>}

        <button className={`btn big ${scanning ? "quiet" : ""}`}
          onClick={() => { setCamError(null); setScanning((s) => !s); }}>
          {scanning ? "Stop camera" : "Open camera"}
        </button>

        <ManualEntry sessionDate={today} sessionNo={sessionNo} onAdded={applyResult} />

        {recent.length > 0 && (
          <div className="recent">
            <ul>
              {recent.map((r, i) => (
                <li key={i}>
                  <span>{r.name}{r.status === "duplicate" && <span className="muted"> · again</span>}</span>
                  <time>{cairoTime(r.at)}</time>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Shell>
  );
}
