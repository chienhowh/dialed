import type { Metadata } from "next";
import Link from "next/link";

import { signIn, signUp } from "./actions";

export const metadata: Metadata = {
  title: "Sign in",
};

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, message } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-12">
      <Link className="text-lg font-semibold tracking-tight" href="/">
        Dialed
      </Link>
      <h1 className="mt-10 text-3xl font-semibold tracking-tight">Sign in with email</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        Use an email address and password. Social login is not part of the MVP foundation.
      </p>

      {error ? (
        <p className="mt-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm" role="status">
          {message}
        </p>
      ) : null}

      <form className="mt-8 space-y-5">
        <div>
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            autoComplete="email"
            className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 outline-none focus:border-[var(--accent)]"
            id="email"
            name="email"
            required
            type="email"
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            autoComplete="current-password"
            className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 outline-none focus:border-[var(--accent)]"
            id="password"
            minLength={8}
            name="password"
            required
            type="password"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            className="min-h-12 rounded-xl bg-[var(--accent)] px-4 font-semibold text-white"
            formAction={signIn}
            type="submit"
          >
            Sign in
          </button>
          <button
            className="min-h-12 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 font-semibold"
            formAction={signUp}
            type="submit"
          >
            Create account
          </button>
        </div>
      </form>
    </main>
  );
}
