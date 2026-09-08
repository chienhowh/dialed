import Link from "next/link";

import {
  QUICK_FEEDBACK_CATALOG,
  SENSORY_RATING_CATALOG,
} from "@/domain/taste/feedback";
import { formatAmount, formatSeconds } from "@/features/brew-plan/display";
import type {
  HistoryAdjustment,
  HistoryAttempt,
  HistoryCoffeeGroup,
  HistoryUnstartedPlan,
} from "@/features/dial-in-history/history";
import type { DialInPlanSummary } from "@/features/dial-in-history/types";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function PlanSnapshot({ plan }: { plan: DialInPlanSummary }) {
  return (
    <div className="mt-4 rounded-xl bg-[var(--background)] p-4">
      <p className="font-semibold">{plan.recipeTemplateName ?? "Brew Plan"}</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
        <div><dt className="text-[var(--muted)]">Dose</dt><dd className="mt-0.5 font-medium">{formatAmount(plan.coffeeDose)}g</dd></div>
        <div><dt className="text-[var(--muted)]">Water</dt><dd className="mt-0.5 font-medium">{formatAmount(plan.waterAmount)}g</dd></div>
        <div><dt className="text-[var(--muted)]">Ratio</dt><dd className="mt-0.5 font-medium">1:{formatAmount(plan.ratio)}</dd></div>
        <div><dt className="text-[var(--muted)]">Temperature</dt><dd className="mt-0.5 font-medium">{plan.waterTemperature}°C</dd></div>
        <div className="col-span-2"><dt className="text-[var(--muted)]">Grind</dt><dd className="mt-0.5 font-medium">{plan.grindLevel}</dd></div>
        <div className="col-span-2"><dt className="text-[var(--muted)]">Target time</dt><dd className="mt-0.5 font-medium">{formatSeconds(plan.targetBrewTimeMin)}–{formatSeconds(plan.targetBrewTimeMax)}</dd></div>
      </dl>
    </div>
  );
}

function AdjustmentSummary({ adjustment }: { adjustment: HistoryAdjustment }) {
  const outcome = adjustment.status === "held"
    ? "Dialed in"
    : adjustment.status === "unsupported"
      ? "No supported adjustment"
      : adjustment.status === "pending"
        ? "Adjustment ready"
        : "Next Brew Plan created";

  return (
    <section aria-label="Adjustment decision" className="mt-5 border-t border-[var(--border)] pt-4">
      <p className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">Adjustment</p>
      <p className="mt-2 font-semibold">{outcome}</p>
      {adjustment.status === "held" ? (
        <p className="mt-1 text-sm text-[var(--muted)]">Keep this brew unchanged.</p>
      ) : null}
      {adjustment.status === "unsupported" ? (
        <p className="mt-1 text-sm text-[var(--muted)]">No reviewed adjustment is available for this feedback.</p>
      ) : null}
      {adjustment.recommendedLabel ? (
        <p className="mt-2 text-sm"><span className="text-[var(--muted)]">Dialed suggested:</span> {adjustment.recommendedLabel}</p>
      ) : null}
      {adjustment.selectedLabel ? (
        <p className="mt-1 text-sm"><span className="text-[var(--muted)]">You chose:</span> {adjustment.selectedLabel}</p>
      ) : null}
      {adjustment.appliedPlanWasManuallyEdited ? (
        <p className="mt-2 text-sm font-medium">Adjusted plan was edited before brewing</p>
      ) : null}
      {adjustment.appliedPlanHref ? (
        <Link className="mt-3 inline-flex min-h-11 items-center font-semibold text-[var(--accent)]" href={adjustment.appliedPlanHref}>
          View Next Brew Plan →
        </Link>
      ) : null}
    </section>
  );
}

function FeedbackSummary({ attempt }: { attempt: HistoryAttempt }) {
  const feedback = attempt.feedback;
  if (!feedback) return null;
  const quickLabels = QUICK_FEEDBACK_CATALOG
    .filter(({ value }) => feedback.quickFeedback.includes(value))
    .map(({ label }) => label);
  const sensoryRatings = SENSORY_RATING_CATALOG.flatMap(({ label, value }) => (
    feedback[value] === null ? [] : [{ label, value: feedback[value] }]
  ));
  const hasDetails = sensoryRatings.length > 0 || feedback.flavorTags.length > 0 || feedback.notes;

  return (
    <section aria-label="Taste feedback" className="mt-5 border-t border-[var(--border)] pt-4">
      <p className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">Feedback</p>
      {feedback.overallRating !== null ? (
        <p aria-label={`${feedback.overallRating} out of 5 stars`} className="mt-2 text-amber-600">
          {"★".repeat(feedback.overallRating)}{"☆".repeat(5 - feedback.overallRating)}
        </p>
      ) : null}
      {quickLabels.length > 0 ? <p className="mt-2 text-sm font-medium">{quickLabels.join(" · ")}</p> : null}
      {hasDetails ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--accent)]">More tasting notes</summary>
          <div className="mt-3 space-y-3 text-sm">
            {sensoryRatings.length > 0 ? (
              <dl className="grid grid-cols-2 gap-2">
                {sensoryRatings.map(({ label, value }) => (
                  <div className="flex justify-between gap-3" key={label}><dt className="text-[var(--muted)]">{label}</dt><dd>{value}/5</dd></div>
                ))}
              </dl>
            ) : null}
            {feedback.flavorTags.length > 0 ? <p><span className="text-[var(--muted)]">Flavors:</span> {feedback.flavorTags.join(" · ")}</p> : null}
            {feedback.notes ? <p className="whitespace-pre-wrap"><span className="text-[var(--muted)]">Notes:</span> {feedback.notes}</p> : null}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function AttemptCard({ attempt }: { attempt: HistoryAttempt }) {
  const statusLabel = attempt.status === "completed"
    ? "Completed"
    : attempt.status === "aborted"
      ? "Stopped"
      : "Brew in progress";

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold">Brew #{attempt.attemptNumber}</h4>
          <time className="mt-1 block text-sm text-[var(--muted)]" dateTime={attempt.startedAt}>{formatDateTime(attempt.startedAt)}</time>
        </div>
        <span className="rounded-full bg-[var(--background)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">{statusLabel}</span>
      </div>
      {attempt.samePlanAsPrevious ? <p className="mt-3 text-sm font-medium text-[var(--accent)]">Same plan as previous brew</p> : null}
      <PlanSnapshot plan={attempt.plan} />
      {attempt.actualBrewTime !== null ? (
        <p className="mt-4 text-sm"><span className="text-[var(--muted)]">Actual finish:</span> <span className="font-semibold">{formatSeconds(attempt.actualBrewTime)}</span></p>
      ) : null}
      <FeedbackSummary attempt={attempt} />
      {attempt.adjustment ? <AdjustmentSummary adjustment={attempt.adjustment} /> : null}
      {attempt.recoveryAction || attempt.brewAgainHref ? (
        <div className="mt-5 flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row">
          {attempt.recoveryAction ? (
            <Link className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white" href={attempt.recoveryAction.href}>
              {attempt.recoveryAction.ctaLabel}
            </Link>
          ) : null}
          {attempt.brewAgainHref ? (
            <Link className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-[var(--border)] px-4 text-sm font-semibold" href={attempt.brewAgainHref}>
              Brew Again
            </Link>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function UnstartedPlanCard({ item }: { item: HistoryUnstartedPlan }) {
  return (
    <article className="rounded-2xl border border-dashed border-[var(--accent)] bg-[var(--surface)] p-5">
      <p className="text-xs font-semibold tracking-[0.14em] text-[var(--accent)] uppercase">{item.action.label}</p>
      <h4 className="mt-2 text-lg font-semibold">Unstarted Brew Plan</h4>
      <PlanSnapshot plan={item.plan} />
      <Link className="mt-5 flex min-h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white" href={item.action.href}>
        {item.action.ctaLabel}
      </Link>
    </article>
  );
}

export function HistoryTimeline({ groups }: { groups: readonly HistoryCoffeeGroup[] }) {
  return (
    <div className="mt-8 space-y-10">
      {groups.map((group) => (
        <section aria-labelledby={`history-coffee-${group.coffeeId}`} key={group.coffeeId}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold" id={`history-coffee-${group.coffeeId}`}>{group.coffeeName}</h2>
              {group.coffeeStatus !== "active" ? <span className="rounded-full bg-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">{group.coffeeStatus === "archived" ? "Archived" : "Finished"}</span> : null}
            </div>
            <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--accent)]" href={`/coffee/${group.coffeeId}`}>Coffee Details →</Link>
          </div>
          <div className="mt-5 space-y-5">
            {group.threads.map((thread) => (
              <details className="group rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 sm:p-5" key={thread.threadId} open>
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">{thread.tasteGoalLabel}</h3>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {thread.completedAttemptCount} completed {thread.completedAttemptCount === 1 ? "brew" : "brews"}
                        {` · Latest activity ${formatDateTime(thread.activityTime)}`}
                      </p>
                      {thread.terminalSummary ? <p className="mt-2 text-sm font-semibold">{thread.terminalSummary.label}</p> : null}
                      {thread.actionableItemCount > 0 ? <p className="mt-2 text-sm font-semibold text-[var(--accent)]">{thread.actionableItemCount} {thread.actionableItemCount === 1 ? "item needs" : "items need"} attention</p> : null}
                    </div>
                    <span aria-hidden="true" className="text-xl text-[var(--muted)] transition group-open:rotate-45">＋</span>
                  </div>
                </summary>
                <div className="mt-5 space-y-4 border-t border-[var(--border)] pt-5">
                  {thread.attempts.map((attempt) => <AttemptCard attempt={attempt} key={attempt.sessionId} />)}
                  {thread.unstartedPlans.map((item) => <UnstartedPlanCard item={item} key={item.plan.id} />)}
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
