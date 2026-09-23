import type { Metadata } from "next";
import Link from "next/link";

import { GoogleSignInForm } from "@/components/auth/google-sign-in-form";
import { OAUTH_CALLBACK_ERROR } from "@/features/auth/oauth";

export const metadata: Metadata = {
  title: "Sign in",
};

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-12">
      <Link className="text-lg font-semibold tracking-tight" href="/">
        Dialed
      </Link>
      <h1 className="mt-10 text-3xl font-semibold tracking-tight">Dial in every cup.</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        Sign in to continue to your coffees, brew plans, and dial-in history.
      </p>

      {error === OAUTH_CALLBACK_ERROR ? (
        <p className="mt-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          We could not complete Google sign-in. Please try again.
        </p>
      ) : null}
      <GoogleSignInForm />
    </main>
  );
}
