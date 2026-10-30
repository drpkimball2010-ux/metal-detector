"use client";

import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export default function AccountSection({ session }: { session: Session }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteAccount() {
    setBusy(true); setError(null);
    const { error } = await supabase.rpc("delete_my_account");
    if (error) {
      setBusy(false);
      setError("Your account couldn't be deleted. Check your connection and try again, or contact us.");
      return;
    }
    await supabase.auth.signOut();
  }

  return (
    <section>
      <h2>Account</h2>
      <div className="card">
        <div className="sechead">
          <div>
            <div className="small muted">Signed in as</div>
            <div>{session.user.email}</div>
          </div>
          <button type="button" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>

        {!open ? (
          <div>
            <button type="button" className="danger" onClick={() => setOpen(true)}>Delete my account</button>
          </div>
        ) : (
          <div className="notice" style={{ display: "grid", gap: 10 }}>
            <p style={{ margin: 0, color: "var(--fg)" }}>
              This permanently deletes your account and every purchase you&apos;ve logged. It can&apos;t be undone.
            </p>
            <div className="field">
              <label htmlFor="confirm-delete">Type DELETE to confirm</label>
              <input id="confirm-delete" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoFocus />
            </div>
            <div className="actions">
              <button type="button" className="danger-fill" disabled={typed.trim().toUpperCase() !== "DELETE" || busy} onClick={deleteAccount}>
                {busy ? "Deleting…" : "Permanently delete account"}
              </button>
              <button type="button" onClick={() => { setOpen(false); setTyped(""); setError(null); }}>Cancel</button>
            </div>
            {error && <p className="msg bad" style={{ margin: 0 }} role="alert">{error}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
