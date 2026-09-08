"use client";

import { useActionState } from "react";

import {
  initialContinueDialInState,
  type ContinueDialInState,
} from "@/features/adjustment/continue";

type ContinueDialInFormProps = {
  action: (state: ContinueDialInState, formData: FormData) => Promise<ContinueDialInState>;
};

export function ContinueDialInForm({ action }: ContinueDialInFormProps) {
  const [state, formAction, pending] = useActionState(action, initialContinueDialInState);

  return (
    <form action={formAction} className="mt-8">
      {state.message ? (
        <p className="mb-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-left text-sm text-red-800" role="alert">
          {state.message}
        </p>
      ) : null}
      <button
        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--accent)] px-5 font-semibold text-white disabled:cursor-wait disabled:opacity-60"
        disabled={pending || !state.retryable}
        type="submit"
      >
        {pending ? "Preparing next brew…" : "Continue Dial-in"}
      </button>
    </form>
  );
}
