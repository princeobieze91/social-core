// src/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "node:module";

const metaEnv = (import.meta as any).env;
const supabaseUrl = (metaEnv && metaEnv.VITE_SUPABASE_URL) || process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (metaEnv && metaEnv.VITE_SUPABASE_ANON_KEY) || process.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Supabase URL or Anon Key is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables."
  );
}

const isServer = typeof globalThis.window === "undefined";

function createSupabaseClient() {
  if (isServer) {
    try {
      const require = createRequire(import.meta.url);
      const ws = require("ws");
      return createClient(supabaseUrl, supabaseAnonKey, { realtime: { transport: ws } });
    } catch {
      return createClient(supabaseUrl, supabaseAnonKey);
    }
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createSupabaseClient();
