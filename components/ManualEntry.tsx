"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, type ScanResult, type Student } from "@/lib/supabase";
import { prettyDate } from "@/lib/time";

type Candidate = Pick<Student, "id" | "name" | "group_name" | "qr_token">;

type Props = {
  /** YYYY-MM-DD in Cairo — today on the Scan tab, the picked day on Attendance. */
  sessionDate: string;
  sessionNo: 1 | 2;
  /** Called after every attempt so the parent can refresh its count / list. */
  onAdded: (res: ScanResult) => void;
};

/**
 * Folds Arabic orthographic variants so a name typed the easy way still matches:
 * "احمد" finds "أحمد", "فاطمه" finds "فاطمة". Latin text just lowercases.
 */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")            // tashkeel + tatweel
    .replace(/[أإآٱ]/g, "ا") // أ إ آ ٱ → ا
    .replace(/ة/g, "ه")                     // ة → ه
    .replace(/ى/g, "ي")                     // ى → ي
    .replace(/ؤ/g, "و")                     // ؤ → و
    .replace(/ئ/g, "ي")                     // ئ → ي
    .trim();
}

const MAX_SHOWN = 50;

/**
 * Marks a student present without their QR code: find them by name, tap Add.
 * Goes through the same record_scan() RPC the camera uses, so the duplicate rule,
 * the scanned_by stamp and the unique constraint all behave identically.
 */
export default function ManualEntry({ sessionDate, sessionNo, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [students, setStudents] = useState<Candidate[] | null>(null);
  const [present, setPresent] = useState<Set<number>>(new Set());
  const [busyId, setBusyId] = useState<number | null>(null);
  const [note, setNote] = useState<{ text: string; tone: "ok" | "warn" | "bad" } | null>(null);

  // The roster is small (80–100) and static during a session: fetch once, filter in memory.
  useEffect(() => {
    if (!open || students) return;
    supabase()
      .from("students")
      .select("id, name, group_name, qr_token")
      .order("name")
      .then(({ data }) => setStudents((data ?? []) as Candidate[]));
  }, [open, students]);

  // Who is already in this session, so nobody gets tapped twice.
  const loadPresent = useCallback(async () => {
    if (!open) return;
    const { data } = await supabase()
      .from("attendance")
      .select("student_id")
      .eq("session_date", sessionDate)
      .eq("session_no", sessionNo);
    setPresent(new Set((data ?? []).map((r) => r.student_id as number)));
  }, [open, sessionDate, sessionNo]);

  useEffect(() => { loadPresent(); }, [loadPresent]);

  async function add(s: Candidate) {
    if (busyId !== null) return;
    setBusyId(s.id);
    const { data, error } = await supabase().rpc("record_scan", {
      p_token: s.qr_token,
      p_session_date: sessionDate,
      p_session_no: sessionNo,
    });
    setBusyId(null);

    if (error) {
      setNote({ text: `Could not add ${s.name}. ${error.message}`, tone: "bad" });
      return;
    }
    const res = data as ScanResult;
    if (res.status === "recorded") {
      setPresent((p) => new Set(p).add(s.id));
      setNote({ text: `${s.name} added.`, tone: "ok" });
      setQ("");
    } else if (res.status === "duplicate") {
      setPresent((p) => new Set(p).add(s.id));
      setNote({ text: `${s.name} was already in this session.`, tone: "warn" });
    } else {
      setNote({ text: `${s.name} has no valid code.`, tone: "bad" });
    }
    onAdded(res);
  }

  function close() {
    setOpen(false);
    setQ("");
    setNote(null);
  }

  if (!open) {
    return (
      <button className="btn quiet" onClick={() => setOpen(true)}>
        Add manually
      </button>
    );
  }

  const nq = norm(q);
  const list = (students ?? []).filter(
    (s) => norm(s.name).includes(nq) || s.qr_token.includes(q.toUpperCase()),
  );
  const shown = list.slice(0, MAX_SHOWN);

  return (
    <div
      className="stack"
      style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 14 }}
    >
      <div className="row" style={{ justifyContent: "space-between" }}>
        <b style={{ fontSize: 15 }}>
          Add to session {sessionNo} <span className="muted">· {prettyDate(sessionDate)}</span>
        </b>
        <button className="btn quiet small" onClick={close}>Close</button>
      </div>

      <input
        className="input"
        placeholder="Search name or code"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
      />

      {note && (
        <p style={{ margin: 0, fontSize: 14, color: `var(--${note.tone})` }} role="status">
          {note.text}
        </p>
      )}

      {students === null ? (
        <p className="muted" style={{ margin: 0 }}>Loading students…</p>
      ) : (
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          {shown.map((s) => (
            <div key={s.id} className="student">
              <div>
                <b>{s.name}</b>
                <code>{s.qr_token}{s.group_name ? ` · ${s.group_name}` : ""}</code>
              </div>
              {present.has(s.id) ? (
                <span className="muted">already in</span>
              ) : (
                <button
                  className="btn quiet small"
                  disabled={busyId !== null}
                  onClick={() => add(s)}
                >
                  {busyId === s.id ? "Adding…" : "Add"}
                </button>
              )}
            </div>
          ))}
          {list.length === 0 && <p className="muted" style={{ margin: 0 }}>No students match.</p>}
          {list.length > shown.length && (
            <p className="muted" style={{ margin: "10px 0 0" }}>
              {list.length - shown.length} more — keep typing to narrow it down.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
