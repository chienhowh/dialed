import { describe, expect, it } from "vitest";

import { getAppUrl, getSupabasePublicEnvironment } from "./env";

describe("getAppUrl", () => {
  it("uses the local application URL when no value is configured", () => {
    expect(getAppUrl(undefined).toString()).toBe("http://localhost:3000/");
  });

  it("accepts a deployed absolute URL", () => {
    expect(getAppUrl("https://dialed.example").toString()).toBe("https://dialed.example/");
  });

  it("rejects a relative URL", () => {
    expect(() => getAppUrl("/dialed")).toThrow("APP_URL must be a valid absolute URL.");
  });
});

describe("getSupabasePublicEnvironment", () => {
  it("returns the public Supabase configuration", () => {
    expect(getSupabasePublicEnvironment("http://127.0.0.1:54321", "publishable-key")).toEqual({
      publishableKey: "publishable-key",
      url: "http://127.0.0.1:54321",
    });
  });

  it("requires both public values", () => {
    expect(() => getSupabasePublicEnvironment(undefined, undefined)).toThrow(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be configured.",
    );
  });

  it("rejects an invalid Supabase URL", () => {
    expect(() => getSupabasePublicEnvironment("supabase", "publishable-key")).toThrow(
      "NEXT_PUBLIC_SUPABASE_URL must be a valid absolute URL.",
    );
  });
});
