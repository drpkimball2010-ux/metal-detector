"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Landing from "@/components/Landing";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
      // No saved sign-in after all: reveal the homepage
      if (!data.session) delete document.documentElement.dataset.auth;
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) delete document.documentElement.dataset.auth;
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (ready && session) return <Dashboard session={session} />;

  // Signed-out visitors (and search engines) get the public homepage.
  // Returning users with a saved sign-in see "Loading your stack" instead of a flash of the sign-in form.
  return (
    <>
      <div className="auth-splash" role="status">
        <span className="brand-mark" aria-hidden="true" />
        <span>Loading your stack…</span>
      </div>
      <Landing />
    </>
  );
}
