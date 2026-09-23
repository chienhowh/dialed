import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, redirectMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import { signInWithGoogle, signOut } from "./actions";

describe("login actions", () => {
  beforeEach(() => {
    process.env.APP_URL = "https://dialed.example";
    redirectMock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.APP_URL;
  });

  it("initiates Google OAuth with the canonical callback URL", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({
      data: { url: "https://supabase.example/auth/v1/authorize?provider=google" },
      error: null,
    });
    createClientMock.mockResolvedValue({ auth: { signInWithOAuth } });

    await expect(signInWithGoogle()).rejects.toThrow("NEXT_REDIRECT");

    expect(signInWithOAuth).toHaveBeenCalledTimes(1);
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "https://dialed.example/auth/callback" },
    });
    expect(redirectMock).toHaveBeenCalledWith(
      "https://supabase.example/auth/v1/authorize?provider=google",
    );
  });

  it("returns a concise error when OAuth initiation fails", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        signInWithOAuth: vi.fn().mockResolvedValue({
          data: { url: null },
          error: new Error("provider unavailable"),
        }),
      },
    });

    await expect(signInWithGoogle()).resolves.toEqual({
      message: "Unable to start Google sign-in. Please try again.",
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("ends the Supabase session before returning to login", async () => {
    const supabaseSignOut = vi.fn().mockResolvedValue({ error: null });
    createClientMock.mockResolvedValue({ auth: { signOut: supabaseSignOut } });

    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT");

    expect(supabaseSignOut).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });
});
