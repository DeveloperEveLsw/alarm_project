import { createClient, SupabaseClient } from "@supabase/supabase-js";
import Config from "react-native-config";
import { supabaseStorageAdapter } from "./supabaseStorage";

const SUPABASE_URL =
  Config.EXPO_PUBLIC_SUPABASE_URL ??
  Config.SUPABASE_URL ??
  Config.SUPABASE_URL ??
  "";

const SUPABASE_ANON_KEY =
  Config.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  Config.SUPABASE_ANON_KEY ??
  Config.SUPABASE_ANON_KEY ??
  "";

const SUPABASE_REDIRECT_URL =
  Config.EXPO_PUBLIC_SUPABASE_REDIRECT_URL ??
  Config.SUPABASE_REDIRECT_URL ??
  Config.SUPABASE_ANON_KEY;

const hasSupabaseConfig = Boolean(SUPABASE_URL) && Boolean(SUPABASE_ANON_KEY);

if (!hasSupabaseConfig) {
  console.warn('[Supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY. Auth features disabled.');
}

export const supabase: SupabaseClient | null = hasSupabaseConfig
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: "pkce",
        storage: supabaseStorageAdapter,
      },
    })
  : null;

export const getSupabaseRedirectUrl = (): string | undefined => SUPABASE_REDIRECT_URL;
