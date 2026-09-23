import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

import { GET } from "./route";

describe("OAuth callback", () => {
  beforeEach(() => {
    process.env.APP_URL = "https://dialed.example";
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.APP_URL;
  });

  it("exchanges a valid authorization code and redirects into Dialed", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    createClientMock.mockResolvedValue({ auth: { exchangeCodeForSession } });

    const response = await GET(
      new NextRequest("https://dialed.example/auth/callback?code=authorization-code"),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("authorization-code");
    expect(response.headers.get("location")).toBe("https://dialed.example/");
  });

  it("handles a missing authorization code without attempting an exchange", async () => {
    const response = await GET(new NextRequest("https://dialed.example/auth/callback"));

    expect(createClientMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://dialed.example/login?error=oauth_callback",
    );
  });

  it("handles an invalid authorization code safely", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: new Error("invalid code") }),
      },
    });

    const response = await GET(
      new NextRequest("https://dialed.example/auth/callback?code=invalid"),
    );

    expect(response.headers.get("location")).toBe(
      "https://dialed.example/login?error=oauth_callback",
    );
  });

  it("ignores arbitrary redirect parameters and uses the fixed app destination", async () => {
    createClientMock.mockResolvedValue({
      auth: { exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }) },
    });

    const response = await GET(
      new NextRequest(
        "https://dialed.example/auth/callback?code=valid&next=https%3A%2F%2Fevil.example",
      ),
    );

    expect(response.headers.get("location")).toBe("https://dialed.example/");
  });
});
