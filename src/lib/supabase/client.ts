import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

type BrowserConfig = { url: string; anonKey: string };

let runtimeConfig: BrowserConfig | null = null;
let cachedClient: SupabaseClient | null = null;

export function setSupabaseBrowserConfig(config: BrowserConfig) {
  const prev = runtimeConfig;
  runtimeConfig = config;
  if (
    prev?.url !== config.url ||
    prev?.anonKey !== config.anonKey
  ) {
    cachedClient = null;
  }
}

function resolveBrowserConfig(): BrowserConfig {
  if (runtimeConfig?.url && runtimeConfig?.anonKey) {
    return runtimeConfig;
  }

  return {
    url: getSupabaseUrl(),
    anonKey: getSupabaseAnonKey(),
  };
}

export function createClient() {
  const { url, anonKey } = resolveBrowserConfig();

  if (cachedClient) return cachedClient;

  cachedClient = createBrowserClient(url, anonKey);
  return cachedClient;
}
