"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AuthGate from "./AuthGate";
import { supabase } from "@/lib/supabase";

const tabs = [
  { href: "/", label: "Scan" },
  { href: "/attendance", label: "Attendance" },
  { href: "/students", label: "Students" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();

  async function signOut() {
    await supabase().auth.signOut();
    router.replace("/login");
  }

  return (
    <AuthGate>
      <div className="shell">
        <header className="top no-print">
          <h1>School of Praise &amp; Prayer</h1>
          <button onClick={signOut}>Sign out</button>
        </header>
        <nav className="nav no-print" aria-label="Sections">
          {tabs.map((t) => (
            <Link key={t.href} href={t.href} aria-current={path === t.href ? "page" : undefined}>
              {t.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </AuthGate>
  );
}
