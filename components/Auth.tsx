"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Auth() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg({ text: error.message === "Invalid login credentials" ? "That email and password don't match an account." : error.message, ok: false });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password, options: { emailRedirectTo: window.location.origin },
      });
      if (error) setMsg({ text: error.message, ok: false });
      else if (!data.session) setMsg({ text: "Check your email for a link to confirm your account, then sign in.", ok: true });
    }
    setBusy(false);
  }

  return (
    <main className="auth">
      <div className="brand"><span className="brand-mark" aria-hidden="true" /><h1>Metal Stack</h1></div>
      <p className="muted" style={{ margin: 0 }}>Log your gold, silver, platinum and palladium and see what it&apos;s worth at live spot prices.</p>
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "signin"} onClick={() => { setMode("signin"); setMsg(null); }}>Sign in</button>
        <button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => { setMode("signup"); setMsg(null); }}>Create account</button>
      </div>
      <form className="card" onSubmit={submit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" minLength={6} required
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password} onChange={(e) => setPassword(e.target.value)} />
          {mode === "signup" && <span className="small muted">At least 6 characters.</span>}
        </div>
        <button className="primary" type="submit" disabled={busy}>{mode === "signin" ? "Sign in" : "Create account"}</button>
        {msg && <p className={`msg ${msg.ok ? "ok" : "bad"}`} style={{ margin: 0 }}>{msg.text}</p>}
      </form>
    </main>
  );
}
