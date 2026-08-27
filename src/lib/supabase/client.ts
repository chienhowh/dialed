import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicEnvironment } from "@/lib/env";
import type { Database } from "@/types/database";

export function createClient() {
  const { publishableKey, url } = getSupabasePublicEnvironment(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  return createBrowserClient<Database>(url, publishableKey);
}
