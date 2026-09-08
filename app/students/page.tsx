"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import QrCard, { downloadPng } from "@/components/QrCard";
import { supabase, type Student } from "@/lib/supabase";

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Student | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase().from("students").select("*").order("name");
    setStudents((data ?? []) as Student[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await supabase().from("students").insert({ name: newName.trim(), group_name: newGroup.trim() || null });
    setNewName(""); setNewGroup(""); setAdding(false);
    load();
  }

  async function remove(s: Student) {
    if (!confirm(`Remove ${s.name} and all their scans?`)) return;
    await supabase().from("students").delete().eq("id", s.id);
    setOpen(null);
    load();
  }

  const list = students.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()) || s.qr_token.includes(q.toUpperCase()));

  return (
    <Shell>
      <div className="stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="count">{students.length}<small>students</small></div>
          <div className="row">
            <Link className="btn quiet small" href="/print">Print all cards</Link>
            <button className="btn small" onClick={() => setAdding((a) => !a)}>{adding ? "Cancel" : "Add"}</button>
          </div>
        </div>

        {adding && (
          <form onSubmit={add} className="stack" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 14 }}>
            <input className="input" placeholder="Full name" value={newName} onChange={(e) => setNewName(e.target.value)} required autoFocus />
            <input className="input" placeholder="Group (optional)" value={newGroup} onChange={(e) => setNewGroup(e.target.value)} />
            <button className="btn">Add student</button>
          </form>
        )}

        <input className="input" placeholder="Search name or code" value={q} onChange={(e) => setQ(e.target.value)} />

        <div>
          {list.map((s) => (
            <div key={s.id} className="student">
              <div>
                <b>{s.name}</b>
                <code>{s.qr_token}{s.group_name ? ` · ${s.group_name}` : ""}</code>
              </div>
              <button className="btn quiet small" onClick={() => setOpen(s)}>QR</button>
            </div>
          ))}
          {list.length === 0 && <p className="muted">No students match.</p>}
        </div>
      </div>

      {open && (
        <div className="sheet" onClick={() => setOpen(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <QrCard name={open.name} token={open.qr_token} />
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn" onClick={() => downloadPng(open.name, open.qr_token)}>Download PNG</button>
              <button className="btn quiet" onClick={() => setOpen(null)}>Close</button>
            </div>
            <button className="btn quiet small" style={{ marginTop: 14, color: "var(--bad)" }} onClick={() => remove(open)}>Remove student</button>
          </div>
        </div>
      )}
    </Shell>
  );
}
