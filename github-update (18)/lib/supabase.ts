import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Add them to .env.local (or your Vercel project settings).",
  );
}

// Where the sign-in is saved in the browser: Supabase's standard spot (sb-<project>-auth-token),
// so people who are already signed in stay signed in. The session refreshes automatically
// and lasts until they sign out.
export const AUTH_STORAGE_KEY = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: AUTH_STORAGE_KEY },
});
