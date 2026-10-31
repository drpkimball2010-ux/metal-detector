"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Auth({ initialMode = "signup" }: { initialMode?: "signin" | "signup" }) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // "#signin" links (like the Sign in button at the top) open the sign-in tab
  useEffect(() => {
    const sync = () => { if (window.location.hash === "#signin") { setMode("signin"); setMsg(null); } };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (mode === "signup" && !agree) {
      setMsg({ text: "Please agree to the Terms of Use and Privacy Policy to create an account.", ok: false });
      return;
    }
    setBusy(true);
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
    <div className="auth-box" id="get-started">
      <span id="signin" aria-hidden="true" />
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => { setMode("signup"); setMsg(null); }}>Create account</button>
        <button type="button" role="tab" aria-selected={mode === "signin"} onClick={() => { setMode("signin"); setMsg(null); }}>Sign in</button>
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
        {mode === "signup" && (
          <label className="check small" htmlFor="agree">
            <input id="agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>I agree to the <Link href="/terms">Terms of Use</Link> and <Link href="/privacy">Privacy Policy</Link>.</span>
          </label>
        )}
        <button className="primary" type="submit" disabled={busy}>{mode === "signin" ? "Sign in" : "Create free account"}</button>
        {msg && <p className={`msg ${msg.ok ? "ok" : "bad"}`} style={{ margin: 0 }}>{msg.text}</p>}
        <p className="small muted" style={{ margin: 0 }}>
          🔒 Only you can see your stack. We never ask for your name, address or where you store your metal, and we never sell your data.
        </p>
      </form>
    </div>
  );
}
