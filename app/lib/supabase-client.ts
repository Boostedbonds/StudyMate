// lib/supabase-client.ts
//
// FIX: Guard against missing environment variables.
// Previously, if NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY were
// undefined (e.g. env vars not set in Vercel, or local dev without .env.local),
// the createClient() call would throw synchronously at module load time.
// This crash bypassed all try/catch in the progress page and surfaced as a raw
// "TypeError: Failed to fetch" in the UI — confusing for students.
//
// Now we: (1) warn in the console, (2) use safe placeholder values so the module
// loads cleanly, and (3) let the progress page's isSupabaseConfigured() check
// skip the fetch gracefully when env vars are absent.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  || "";
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  // Only warn — don't throw. The app will work in offline/local mode.
  console.warn(
    "[Supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.\n" +
    "Progress sync will be skipped. Add these to your .env.local or Vercel environment variables."
  );
}

// Use placeholder values when env vars are missing so createClient() doesn't throw.
// All actual Supabase calls will be skipped by the isSupabaseConfigured() guard
// in progress/page.tsx before they can reach this client.
export const supabaseClient = createClient(
  supabaseUrl  || "https://placeholder.supabase.co",
  supabaseKey  || "placeholder-anon-key"
);