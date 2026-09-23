import { describe, expect, it } from "vitest";

import { getAuthCallbackUrl, OAUTH_CALLBACK_ERROR } from "./oauth";

describe("getAuthCallbackUrl", () => {
  it("builds the local OAuth callback from APP_URL", () => {
    expect(getAuthCallbackUrl(new URL("http://localhost:3000"))).toBe(
      "http://localhost:3000/auth/callback",
    );
  });

  it("builds the deployed OAuth callback without hard-coding its hostname", () => {
    expect(getAuthCallbackUrl(new URL("https://dialed.example/base"))).toBe(
      "https://dialed.example/auth/callback",
    );
  });

  it("defines the only recognized OAuth callback error code", () => {
    expect(OAUTH_CALLBACK_ERROR).toBe("oauth_callback");
  });
});
