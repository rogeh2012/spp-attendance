"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setError("Email or password is wrong."); return; }
    router.replace("/");
  }

  return (
    <div className="shell" style={{ paddingTop: 64 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 4px" }}>
        School of Praise &amp; Prayer
      </h1>
      <p className="muted" style={{ marginTop: 0, marginBottom: 28 }}>Attendance — sign in to scan.</p>
      <form onSubmit={signIn} className="stack">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" className="input" type="email" autoComplete="username" required
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" className="input" type="password" autoComplete="current-password" required
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}
