"use client";

import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import ManualEntry from "@/components/ManualEntry";
import { supabase, type AttendanceRow } from "@/lib/supabase";
import { cairoToday, cairoTime, cairoDateTime, prettyDate } from "@/lib/time";

export default function AttendancePage() {
  const [date, setDate] = useState<string>(cairoToday());
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase()
      .from("attendance")
      .select("id, session_date, session_no, scanned_at, student:students(id, name, group_name)")
      .eq("session_date", date)
      .order("scanned_at", { ascending: true });
    setRows((data ?? []) as unknown as AttendanceRow[]);
    setLoading(false);
  }, [date]);

  useEffect(() => { load(); }, [load]);

  async function remove(id: number) {
    if (!confirm("Remove this scan?")) return;
    await supabase().from("attendance").delete().eq("id", id);
    load();
  }

  /** Export everything (all days) to .xlsx or .csv, times in Cairo. */
  async function exportAll(kind: "xlsx" | "csv") {
    setExporting(true);
    const { data } = await supabase()
      .from("attendance")
      .select("id, session_date, session_no, scanned_at, student:students(id, name, group_name)")
      .order("session_date").order("session_no").order("scanned_at");
    const all = (data ?? []) as unknown as AttendanceRow[];
    const XLSX = await import("xlsx");
    const sheetRows = all.map((r) => ({
      Name: r.student?.name ?? "",
      Group: r.student?.group_name ?? "",
      Date: r.session_date,
      Session: r.session_no,
      "Time (Cairo)": cairoTime(r.scanned_at),
      "Scanned at (Cairo)": cairoDateTime(r.scanned_at),
    }));
    const ws = XLSX.utils.json_to_sheet(sheetRows);
    ws["!cols"] = [{ wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");

    // second sheet: one row per student, one column per (date, session), 1 = present
    const { data: students } = await supabase().from("students").select("id, name, group_name").order("name");
    const cols = Array.from(new Set(all.map((r) => `${r.session_date} S${r.session_no}`))).sort();
    const present = new Set(all.map((r) => `${r.student?.id}|${r.session_date} S${r.session_no}`));
    const matrix = (students ?? []).map((s) => {
      const o: Record<string, string | number> = { Name: s.name, Group: s.group_name ?? "" };
      let total = 0;
      for (const c of cols) { const p = present.has(`${s.id}|${c}`) ? 1 : 0; o[c] = p; total += p; }
      o["Total"] = total;
      return o;
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(matrix), "Summary");

    const stamp = cairoToday();
    if (kind === "xlsx") XLSX.writeFile(wb, `spp-attendance-${stamp}.xlsx`);
    else XLSX.writeFile(wb, `spp-attendance-${stamp}.csv`, { bookType: "csv" });
    setExporting(false);
  }

  const isSaturday = new Date(date + "T12:00:00Z").getUTCDay() === 6;
  const s1 = rows.filter((r) => r.session_no === 1);
  const s2 = rows.filter((r) => r.session_no === 2);

  return (
    <Shell>
      <div className="stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: "auto" }} />
          <div className="count" style={{ textAlign: "right" }}>
            {loading ? "–" : rows.length}<small>scans on {prettyDate(date)}</small>
          </div>
        </div>

        {([{ n: 1, list: s1 }, { n: 2, list: s2 }] as { n: 1 | 2; list: AttendanceRow[] }[])
          .filter(({ n, list }) => n === 1 || list.length > 0 || isSaturday).map(({ n, list }) => (
          <section key={n}>
            <h2 style={{ fontSize: 15, margin: "6px 0 8px" }}>Session {n} <span className="muted">· {list.length}</span></h2>
            {list.length === 0 ? <p className="muted" style={{ margin: 0 }}>No scans yet.</p> : (
              <table className="table">
                <thead><tr><th>Name</th><th>Time</th><th></th></tr></thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.id}>
                      <td>{r.student?.name ?? "—"}</td>
                      <td className="num">{cairoTime(r.scanned_at)}</td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn quiet small" onClick={() => remove(r.id)} aria-label="Remove scan">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {/* Backfill: the day comes from the date picker, the session from this block. */}
            <div style={{ marginTop: 10 }}>
              <ManualEntry sessionDate={date} sessionNo={n} onAdded={load} />
            </div>
          </section>
        ))}

        <div className="row">
          <button className="btn quiet" disabled={exporting} onClick={() => exportAll("xlsx")}>Export Excel</button>
          <button className="btn quiet" disabled={exporting} onClick={() => exportAll("csv")}>Export CSV</button>
        </div>
        <p className="muted" style={{ margin: 0 }}>Export includes every day, with a Summary sheet (one row per student, one column per session).</p>
      </div>
    </Shell>
  );
}
