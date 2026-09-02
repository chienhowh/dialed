"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  initialBrewPlanEditFormState,
  type BrewPlanEditFormState,
} from "@/features/brew-plan/edit-form";
import type { BrewPlan } from "@/features/brew-plan/types";

type BrewPlanEditFormProps = {
  action: (state: BrewPlanEditFormState, formData: FormData) => Promise<BrewPlanEditFormState>;
  plan: BrewPlan;
};

const inputClassName = "mt-2 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-base outline-none focus:border-[var(--accent)]";

function FieldError({ error }: { error?: string }) {
  return error ? <p className="mt-2 text-sm text-red-700" role="alert">{error}</p> : null;
}

export function BrewPlanEditForm({ action, plan }: BrewPlanEditFormProps) {
  const [state, formAction, pending] = useActionState(action, initialBrewPlanEditFormState);

  return (
    <form action={formAction} className="mt-8 space-y-7">
      {state.message ? (
        <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{state.message}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium" htmlFor="coffeeDose">Coffee dose (g)</label>
          <input className={inputClassName} defaultValue={plan.coffeeDose} id="coffeeDose" max="100" min="1" name="coffeeDose" required step="0.1" type="number" />
          <FieldError error={state.errors?.coffeeDose} />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="waterAmount">Water (g)</label>
          <input className={inputClassName} defaultValue={plan.waterAmount} id="waterAmount" max="2000" min="1" name="waterAmount" required step="0.1" type="number" />
          <FieldError error={state.errors?.waterAmount} />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="ratio">Ratio (1:x)</label>
          <input className={inputClassName} defaultValue={plan.ratio} id="ratio" max="100" min="1" name="ratio" required step="0.01" type="number" />
          <FieldError error={state.errors?.ratio} />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="waterTemperature">Temperature (°C)</label>
          <input className={inputClassName} defaultValue={plan.waterTemperature} id="waterTemperature" max="100" min="1" name="waterTemperature" required step="1" type="number" />
          <FieldError error={state.errors?.waterTemperature} />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="grindLevel">Grind level</label>
        <input className={inputClassName} defaultValue={plan.grindLevel} id="grindLevel" maxLength={80} name="grindLevel" required />
        <FieldError error={state.errors?.grindLevel} />
      </div>

      <fieldset className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <legend className="px-2 font-semibold">Target brew time</legend>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium" htmlFor="targetBrewTimeMin">Earliest finish (seconds)</label>
            <input className={inputClassName} defaultValue={plan.targetBrewTimeMin} id="targetBrewTimeMin" max="3600" min="0" name="targetBrewTimeMin" required step="1" type="number" />
            <FieldError error={state.errors?.targetBrewTimeMin} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="targetBrewTimeMax">Latest finish (seconds)</label>
            <input className={inputClassName} defaultValue={plan.targetBrewTimeMax} id="targetBrewTimeMax" max="3600" min="0" name="targetBrewTimeMax" required step="1" type="number" />
            <FieldError error={state.errors?.targetBrewTimeMax} />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-semibold">Brewing steps</legend>
        <div className="mt-4 space-y-4">
          {plan.steps.map((step) => {
            const prefix = `step.${step.id}`;
            return (
              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4" key={step.id}>
                <h2 className="font-semibold">{step.stepOrder}. {step.note ?? (step.stepType === "pour" ? "Pour" : "Wait")}</h2>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[var(--muted)]" htmlFor={`${prefix}.startTime`}>Start (seconds)</label>
                    <input className={inputClassName} defaultValue={step.startTime} id={`${prefix}.startTime`} max="3600" min="0" name={`${prefix}.startTime`} required step="1" type="number" />
                    <FieldError error={state.errors?.[`${prefix}.startTime`]} />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--muted)]" htmlFor={`${prefix}.duration`}>Duration (seconds)</label>
                    <input className={inputClassName} defaultValue={step.duration ?? ""} id={`${prefix}.duration`} max="3600" min="0" name={`${prefix}.duration`} step="1" type="number" />
                    <FieldError error={state.errors?.[`${prefix}.duration`]} />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs text-[var(--muted)]" htmlFor={`${prefix}.targetWater`}>Cumulative target water (g)</label>
                  <input
                    className={inputClassName}
                    defaultValue={step.targetWater ?? ""}
                    disabled={step.stepType !== "pour"}
                    id={`${prefix}.targetWater`}
                    max="2000"
                    min="0.1"
                    name={`${prefix}.targetWater`}
                    required={step.stepType === "pour"}
                    step="0.1"
                    type="number"
                  />
                  <FieldError error={state.errors?.[`${prefix}.targetWater`]} />
                </div>
              </section>
            );
          })}
        </div>
      </fieldset>

      <p className="text-sm leading-6 text-[var(--muted)]">
        Changes apply only to this Brew Plan snapshot. The official recipe, coffee details, and Taste Goal stay unchanged.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Link className="flex min-h-12 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 font-semibold" href={`/brew/${plan.id}`}>
          Cancel
        </Link>
        <button className="min-h-12 rounded-xl bg-[var(--accent)] px-4 font-semibold text-white disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">
          {pending ? "Saving…" : "Save Plan"}
        </button>
      </div>
    </form>
  );
}
