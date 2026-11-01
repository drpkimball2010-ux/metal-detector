"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { SITE_NAME } from "@/lib/site";
import BrandMark from "@/components/BrandMark";

// Opened from the "reset your password" email. The link signs the person in for this one purpose,
// then they choose a new password here.
export default function ResetPage() {
  const [state, setState] = useState<"checking" | "ready" | "invalid" | "done">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (/error_code=|error=/.test(window.location.hash + window.location.search)) { setState("invalid"); return; }
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setState((s) => (s === "done" ? s : "ready"));
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setState((s) => (s === "checking" ? "ready" : s)); });
    const t = setTimeout(() => setState((s) => (s === "checking" ? "invalid" : s)), 6000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    if (password.length < 6) return setMsg("Use at least 6 characters.");
    if (password !== confirm) return setMsg("Those passwords don't match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setMsg(/different|same/i.test(error.message) ? "Choose a password different from your old one." : error.message);
    else { setState("done"); history.replaceState(null, "", "/reset"); }
  }

  return (
    <main className="wrap" style={{ maxWidth: 520 }}>
      <div className="topbar">
        <Link href="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
          <BrandMark /><span style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: "1.35rem" }}>{SITE_NAME}</span>
        </Link>
      </div>
      <section className="card">
        <h2 style={{ margin: 0 }}>Set a new password</h2>
        {state === "checking" && <p className="muted" style={{ margin: 0 }}>Checking your reset link…</p>}
        {state === "invalid" && (
          <>
            <p style={{ margin: 0 }}>This reset link has expired or was already used. Links work once and expire after a while.</p>
            <Link className="button-link primary" href="/#signin" style={{ justifySelf: "start" }}>Request a new link</Link>
          </>
        )}
        {state === "ready" && (
          <form onSubmit={save} style={{ display: "grid", gap: 14 }}>
            <div className="field">
              <label htmlFor="np">New password</label>
              <input id="np" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
              <span className="small muted">At least 6 characters.</span>
            </div>
            <div className="field">
              <label htmlFor="np2">Type it again</label>
              <input id="np2" type="password" autoComplete="new-password" minLength={6} required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <button className="primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save new password"}</button>
            {msg && <p className="msg bad" style={{ margin: 0 }}>{msg}</p>}
          </form>
        )}
        {state === "done" && (
          <>
            <p className="msg ok" style={{ margin: 0 }}>Your password is updated and you&apos;re signed in.</p>
            <Link className="button-link primary" href="/" style={{ justifySelf: "start" }}>Go to your stack</Link>
          </>
        )}
      </section>
    </main>
  );
}
