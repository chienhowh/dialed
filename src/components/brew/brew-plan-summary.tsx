import Link from "next/link";

import { getOriginLabel, getProcessLabel, getRoastLevelLabel } from "@/domain/coffee/bean-profile";
import { formatTasteGoals } from "@/domain/taste/taste-goal";
import { formatAmount, formatSeconds } from "@/features/brew-plan/display";
import type { BrewPlan } from "@/features/brew-plan/types";
import { getCoffeeDisplayName } from "@/features/coffee/coffee-display";

export function BrewPlanSummary({ plan }: { plan: BrewPlan }) {
  const { beanProfile } = plan.coffee;

  return (
    <section aria-labelledby="brew-plan-heading" className="mx-auto max-w-lg">
      <div className="flex items-center justify-between gap-4">
        <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--muted)]" href={`/coffee/${plan.coffee.id}`}>
          ← {getCoffeeDisplayName(plan.coffee)}
        </Link>
        {plan.recommendationSource === "manual" ? (
          <span className="rounded-full bg-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">Edited</span>
        ) : null}
      </div>

      <header className="mt-5">
        <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">Your Brew Plan</p>
        <h1 id="brew-plan-heading" className="mt-2 text-3xl font-semibold tracking-tight">{getCoffeeDisplayName(plan.coffee)}</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          {getOriginLabel(beanProfile.originCountry)}{beanProfile.region ? ` · ${beanProfile.region}` : ""}
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {getProcessLabel(beanProfile.process)} · {getRoastLevelLabel(beanProfile.roastLevel)}
        </p>
      </header>

      <div className="mt-7">
        <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">For</p>
        <p className="mt-2 text-lg font-semibold">{formatTasteGoals(plan.primaryTasteGoal, plan.secondaryTasteGoal)}</p>
      </div>

      <section aria-labelledby="recommended-start-heading" className="mt-7 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">Recommended start</p>
        <h2 id="recommended-start-heading" className="mt-2 text-2xl font-semibold">{plan.recipeName ?? "Custom Plan"}</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{plan.expectedFlavor}</p>
        <details className="mt-5 border-t border-[var(--border)] pt-4">
          <summary className="cursor-pointer font-semibold">Why this brew?</summary>
          <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)]">
            {plan.recommendationReason.split("\n\n").map((reason, index) => <p key={`${index}-${reason}`}>{reason}</p>)}
          </div>
        </details>
      </section>

      <section aria-label="Brew parameters" className="mt-7">
        <dl className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-[var(--surface)] px-2 py-4">
            <dd className="text-xl font-semibold">{formatAmount(plan.coffeeDose)}g</dd>
            <dt className="mt-1 text-xs text-[var(--muted)]">Coffee</dt>
          </div>
          <div className="rounded-xl bg-[var(--surface)] px-2 py-4">
            <dd className="text-xl font-semibold">{formatAmount(plan.waterAmount)}g</dd>
            <dt className="mt-1 text-xs text-[var(--muted)]">Water</dt>
          </div>
          <div className="rounded-xl bg-[var(--surface)] px-2 py-4">
            <dd className="text-xl font-semibold">{plan.waterTemperature}°C</dd>
            <dt className="mt-1 text-xs text-[var(--muted)]">Temperature</dt>
          </div>
        </dl>
        <p className="mt-4 text-center text-sm font-medium">Ratio 1:{formatAmount(plan.ratio)} · {plan.grindLevel}</p>
      </section>

      <section aria-labelledby="brew-steps-heading" className="mt-8 border-t border-[var(--border)] pt-7">
        <h2 id="brew-steps-heading" className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">Brewing Steps</h2>
        <ol className="mt-4 divide-y divide-[var(--border)]">
          {plan.steps.map((step) => (
            <li className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 py-4 text-sm" key={step.id}>
              <time className="font-medium" dateTime={`PT${step.startTime}S`}>{formatSeconds(step.startTime)}</time>
              <span>{step.note ?? (step.stepType === "pour" ? "Pour" : "Wait")}</span>
              <span className="font-semibold text-[var(--accent)]">{step.targetWater === null ? "—" : `→ ${formatAmount(step.targetWater)}g`}</span>
            </li>
          ))}
        </ol>
        <p className="mt-5 flex justify-between gap-4 text-sm">
          <span className="text-[var(--muted)]">Target finish</span>
          <strong>{formatSeconds(plan.targetBrewTimeMin)}–{formatSeconds(plan.targetBrewTimeMax)}</strong>
        </p>
      </section>

      <div className="mt-9 space-y-3">
        <Link className="flex min-h-12 items-center justify-center rounded-xl bg-[var(--accent)] px-5 font-semibold text-white" href={`/brew/${plan.id}/start`}>
          Start Brewing
        </Link>
        {plan.hasStartedBrew ? (
          <p className="text-center text-sm text-[var(--muted)]">This plan is locked to preserve its Brew Session history.</p>
        ) : (
          <Link className="flex min-h-12 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 font-semibold" href={`/brew/${plan.id}/edit`}>
            Edit Plan
          </Link>
        )}
      </div>
    </section>
  );
}
