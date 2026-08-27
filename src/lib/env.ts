const LOCAL_APP_URL = "http://localhost:3000";

export type SupabasePublicEnvironment = {
  publishableKey: string;
  url: string;
};

export function getAppUrl(value = process.env.APP_URL): URL {
  try {
    return new URL(value ?? LOCAL_APP_URL);
  } catch {
    throw new Error("APP_URL must be a valid absolute URL.");
  }
}

export function getSupabasePublicEnvironment(
  url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
): SupabasePublicEnvironment {
  if (!url || !publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be configured.",
    );
  }

  try {
    new URL(url);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid absolute URL.");
  }

  return { publishableKey, url };
}
