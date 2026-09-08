import Link from "next/link";

import { QUICK_FEEDBACK_CATALOG } from "@/domain/taste/feedback";
import type { DialInActionableItem, DialInThreadSummary } from "@/features/dial-in-history/types";

type DialInThreadCardProps = {
  thread: DialInThreadSummary;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ActionLink({ action }: { action: DialInActionableItem }) {
  return (
    <div>
      <p className="text-sm text-[var(--muted)]">{action.label}</p>
      <Link
        className="mt-3 flex min-h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white"
        href={action.href}
      >
        {action.ctaLabel}
      </Link>
    </div>
  );
}

export function DialInThreadCard({ thread }: DialInThreadCardProps) {
  const primaryAction = thread.actionableItems[0] ?? null;
  const additionalActions = thread.actionableItems.slice(1);
  const latestFeedback = thread.latestCompletedAttempt?.feedback ?? null;
  const quickFeedbackLabels = latestFeedback
    ? QUICK_FEEDBACK_CATALOG
      .filter(({ value }) => latestFeedback.quickFeedback.includes(value))
      .map(({ label }) => label)
    : [];

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <h3 className="text-lg font-semibold">{thread.tasteGoalLabel}</h3>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[var(--muted)]">
        <span>{thread.completedAttemptCount} completed {thread.completedAttemptCount === 1 ? "brew" : "brews"}</span>
        {thread.latestCompletedAttempt?.finishedAt ? (
          <time dateTime={thread.latestCompletedAttempt.finishedAt}>
            Last brew {formatDateTime(thread.latestCompletedAttempt.finishedAt)}
          </time>
        ) : null}
      </div>

      {latestFeedback ? (
        <div className="mt-4">
          {latestFeedback.overallRating !== null ? (
            <p aria-label={`${latestFeedback.overallRating} out of 5 stars`} className="text-sm text-amber-600">
              {"★".repeat(latestFeedback.overallRating)}{"☆".repeat(5 - latestFeedback.overallRating)}
            </p>
          ) : null}
          {quickFeedbackLabels.length > 0 ? (
            <p className="mt-1 text-sm">{quickFeedbackLabels.join(" · ")}</p>
          ) : null}
        </div>
      ) : null}

      {primaryAction ? (
        <div className="mt-5 border-t border-[var(--border)] pt-5">
          <ActionLink action={primaryAction} />
        </div>
      ) : thread.terminalSummary ? (
        <p className="mt-5 rounded-xl bg-[var(--background)] px-4 py-3 text-sm font-semibold">
          {thread.terminalSummary.label}
        </p>
      ) : null}

      {additionalActions.length > 0 ? (
        <details className="mt-4 border-t border-[var(--border)] pt-4">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--accent)]">
            {additionalActions.length} more {additionalActions.length === 1 ? "item needs" : "items need"} attention
          </summary>
          <div className="mt-4 space-y-5">
            {additionalActions.map((action) => <ActionLink action={action} key={action.id} />)}
          </div>
        </details>
      ) : null}
    </article>
  );
}
