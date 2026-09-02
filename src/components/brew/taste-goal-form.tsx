"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { TASTE_GOAL_CATALOG } from "@/domain/taste/taste-goal";
import {
  initialTasteGoalFormState,
  type TasteGoalFormState,
} from "@/features/brew-plan/taste-goal-form";

type TasteGoalFormProps = {
  action: (state: TasteGoalFormState, formData: FormData) => Promise<TasteGoalFormState>;
  cancelHref: string;
};

export function TasteGoalForm({ action, cancelHref }: TasteGoalFormProps) {
  const [state, formAction, pending] = useActionState(action, initialTasteGoalFormState);
  const [primaryGoal, setPrimaryGoal] = useState(state.values?.primaryTasteGoal ?? "");
  const [secondaryGoal, setSecondaryGoal] = useState(state.values?.secondaryTasteGoal ?? "");
  const [showSecondary, setShowSecondary] = useState(Boolean(state.values?.secondaryTasteGoal));

  return (
    <form action={formAction} className="mt-8">
      {state.message ? (
        <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {state.message}
        </p>
      ) : null}

      <fieldset className="mt-6">
        <legend className="font-semibold">Choose your main goal</legend>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {TASTE_GOAL_CATALOG.map(({ description, label, value }) => (
            <label className="cursor-pointer" key={value}>
              <input
                className="peer sr-only"
                checked={primaryGoal === value}
                name="primaryTasteGoal"
                onChange={() => setPrimaryGoal(value)}
                required
                type="radio"
                value={value}
              />
              <span className="flex min-h-24 flex-col justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 peer-checked:border-[var(--accent)] peer-checked:bg-[var(--accent)] peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)]">
                <span className="font-semibold">{label}</span>
                <span className="mt-1 text-xs leading-5 opacity-75">{description}</span>
              </span>
            </label>
          ))}
        </div>
        {state.errors?.primaryTasteGoal ? <p className="mt-3 text-sm text-red-700" role="alert">{state.errors.primaryTasteGoal}</p> : null}
      </fieldset>

      {showSecondary ? (
        <div className="mt-7">
          <label className="text-sm font-medium" htmlFor="secondaryTasteGoal">Secondary goal (optional)</label>
          <select
            className="mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-base outline-none focus:border-[var(--accent)]"
            id="secondaryTasteGoal"
            name="secondaryTasteGoal"
            onChange={(event) => setSecondaryGoal(event.target.value)}
            value={secondaryGoal}
          >
            <option value="">No secondary goal</option>
            {TASTE_GOAL_CATALOG.map(({ label, value }) => (
              <option disabled={value === primaryGoal} key={value} value={value}>{label}</option>
            ))}
          </select>
          {state.errors?.secondaryTasteGoal ? <p className="mt-2 text-sm text-red-700" role="alert">{state.errors.secondaryTasteGoal}</p> : null}
        </div>
      ) : (
        <button className="mt-7 min-h-11 text-sm font-semibold text-[var(--accent)]" onClick={() => setShowSecondary(true)} type="button">
          + Add secondary goal
        </button>
      )}

      <div className="mt-8 grid grid-cols-2 gap-3">
        <Link className="flex min-h-12 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 font-semibold" href={cancelHref}>
          Cancel
        </Link>
        <button className="min-h-12 rounded-xl bg-[var(--accent)] px-4 font-semibold text-white disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">
          {pending ? "Finding…" : "Find a Brew Plan"}
        </button>
      </div>
    </form>
  );
}
