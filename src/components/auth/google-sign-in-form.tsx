"use client";

import { useActionState } from "react";

import { signInWithGoogle, type GoogleSignInState } from "@/app/(auth)/login/actions";

const initialState: GoogleSignInState = { message: null };

export function GoogleSignInForm() {
  const [state, formAction, pending] = useActionState(signInWithGoogle, initialState);

  return (
    <form action={formAction} className="mt-8">
      {state.message ? (
        <p className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {state.message}
        </p>
      ) : null}
      <button
        aria-disabled={pending}
        className="min-h-12 w-full rounded-xl bg-[var(--accent)] px-4 font-semibold text-white disabled:cursor-wait disabled:opacity-70"
        disabled={pending}
        type="submit"
      >
        {pending ? "Connecting to Google…" : "Continue with Google"}
      </button>
    </form>
  );
}
