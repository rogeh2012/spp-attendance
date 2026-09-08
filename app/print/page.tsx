"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import QrCard from "@/components/QrCard";
import { supabase, type Student } from "@/lib/supabase";

/** All cards on one page. Browser Print → Save as PDF gives the printable sheet (3 per row on A4). */
export default function PrintPage() {
  const [students, setStudents] = useState<Student[]>([]);
  useEffect(() => {
    supabase().from("students").select("*").order("name").then(({ data }) => setStudents((data ?? []) as Student[]));
  }, []);

  return (
    <AuthGate>
      <div className="shell" style={{ maxWidth: 720 }}>
        <div className="row no-print" style={{ justifyContent: "space-between", padding: "18px 0" }}>
          <Link href="/students">← Back</Link>
          <button className="btn small" onClick={() => window.print()}>Print / Save as PDF</button>
        </div>
        <div className="cards">
          {students.map((s) => <QrCard key={s.id} name={s.name} token={s.qr_token} size={220} />)}
        </div>
      </div>
    </AuthGate>
  );
}
