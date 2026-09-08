"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sb = supabase();
    let alive = true;
    sb.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (!data.session) router.replace("/login");
      else setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace("/login");
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [router]);

  if (!ready) return <p className="muted" style={{ padding: 24 }}>Checking sign-in…</p>;
  return <>{children}</>;
}
