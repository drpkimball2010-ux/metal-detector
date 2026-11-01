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
  const [forgot, setForgot] = useState(false);

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset` });
    setBusy(false);
    // Same message either way, so this can't be used to check who has an account
    if (error && /rate|limit|seconds/i.test(error.message)) setMsg({ text: "Please wait a minute before asking for another email.", ok: false });
    else setMsg({ text: "If that email has an account, a link to set a new password is on its way. Check your inbox (and spam).", ok: true });
  }

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
        <button type="button" role="tab" aria-selected={mode === "signup" && !forgot} onClick={() => { setMode("signup"); setForgot(false); setMsg(null); }}>Create account</button>
        <button type="button" role="tab" aria-selected={mode === "signin" || forgot} onClick={() => { setMode("signin"); setForgot(false); setMsg(null); }}>Sign in</button>
      </div>
      {forgot ? (
        <form className="card" onSubmit={sendReset}>
          <div>
            <strong>Reset your password</strong>
            <p className="small muted" style={{ margin: "4px 0 0" }}>Enter your email and we&apos;ll send you a link to set a new one.</p>
          </div>
          <div className="field">
            <label htmlFor="reset-email">Email</label>
            <input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </div>
          <button className="primary" type="submit" disabled={busy}>{busy ? "Sending…" : "Email me a reset link"}</button>
          {msg && <p className={`msg ${msg.ok ? "ok" : "bad"}`} style={{ margin: 0 }}>{msg.text}</p>}
          <button type="button" className="link" style={{ justifySelf: "start", padding: 0 }} onClick={() => { setForgot(false); setMsg(null); }}>← Back to sign in</button>
        </form>
      ) : (
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
          {mode === "signin" && (
            <button type="button" className="link small" style={{ justifySelf: "start", padding: 0 }}
              onClick={() => { setForgot(true); setMsg(null); }}>Forgot password?</button>
          )}
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
      )}
    </div>
  );
}
