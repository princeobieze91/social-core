// src/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const isBrowser = typeof window !== "undefined";
const metaEnv = isBrowser ? (import.meta as any).env : {};

const supabaseUrl = (metaEnv && metaEnv.VITE_SUPABASE_URL) || process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (metaEnv && metaEnv.VITE_SUPABASE_ANON_KEY) || process.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Supabase URL or Anon Key is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
