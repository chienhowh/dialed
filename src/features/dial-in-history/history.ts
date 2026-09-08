import { getCandidateSnapshotLabel } from "@/features/adjustment/config";

import type {
  DialInActionableItem,
  DialInBrewAttempt,
  DialInPlanSummary,
  DialInThreadSummary,
} from "./types";

export type HistoryAdjustment = {
  appliedPlanHref: string | null;
  appliedPlanWasManuallyEdited: boolean;
  recommendedLabel: string | null;
  selectedLabel: string | null;
  status: NonNullable<DialInBrewAttempt["decision"]>["status"];
};

export type HistoryAttempt = DialInBrewAttempt & {
  adjustment: HistoryAdjustment | null;
  attemptNumber: number;
  brewAgainHref: string | null;
  recoveryAction: DialInActionableItem | null;
  samePlanAsPrevious: boolean;
};

export type HistoryUnstartedPlan = {
  action: DialInActionableItem;
  plan: DialInPlanSummary;
};

export type HistoryThread = {
  actionableItemCount: number;
  activityTime: string;
  attempts: HistoryAttempt[];
  completedAttemptCount: number;
  createdAt: string;
  tasteGoalLabel: string;
  terminalSummary: DialInThreadSummary["terminalSummary"];
  threadId: string;
  unstartedPlans: HistoryUnstartedPlan[];
};

export type HistoryCoffeeGroup = {
  activityTime: string;
  coffeeId: string;
  coffeeName: string;
  coffeeStatus: DialInThreadSummary["coffeeStatus"];
  threads: HistoryThread[];
};

function timestampValue(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function compareTimeAscending(left: string, right: string) {
  return timestampValue(left) - timestampValue(right);
}

function compareTimeDescending(left: string, right: string) {
  return timestampValue(right) - timestampValue(left);
}

function toAdjustment(attempt: DialInBrewAttempt): HistoryAdjustment | null {
  if (!attempt.decision) return null;

  return {
    appliedPlanHref: attempt.generatedNextPlanId ? `/brew/${attempt.generatedNextPlanId}` : null,
    appliedPlanWasManuallyEdited: attempt.generatedNextPlanWasManuallyEdited,
    recommendedLabel: attempt.decision.recommendedCandidate
      ? getCandidateSnapshotLabel(attempt.decision.recommendedCandidate)
      : null,
    selectedLabel: attempt.decision.selectedCandidate
      ? getCandidateSnapshotLabel(attempt.decision.selectedCandidate)
      : null,
    status: attempt.decision.status,
  };
}

function toHistoryThread(thread: DialInThreadSummary): HistoryThread | null {
  const chronologicalAttempts = [...thread.attempts].sort((left, right) => (
    compareTimeAscending(left.startedAt, right.startedAt)
    || left.sessionId.localeCompare(right.sessionId)
  ));
  const attempts = chronologicalAttempts.map((attempt, index): HistoryAttempt => ({
    ...attempt,
    adjustment: toAdjustment(attempt),
    attemptNumber: index + 1,
    brewAgainHref: attempt.status === "completed" || attempt.status === "aborted"
      ? `/brew/${attempt.plan.id}`
      : null,
    recoveryAction: thread.actionableItems.find(({ sessionId }) => sessionId === attempt.sessionId) ?? null,
    samePlanAsPrevious: index > 0 && chronologicalAttempts[index - 1]?.plan.id === attempt.plan.id,
  }));
  const unstartedPlans = thread.actionableItems.flatMap((action): HistoryUnstartedPlan[] => {
    if (action.sessionId !== null) return [];
    const plan = thread.plans.find(({ id }) => id === action.planId);
    return plan ? [{ action, plan }] : [];
  });

  if (attempts.length === 0 && unstartedPlans.length === 0) return null;

  return {
    actionableItemCount: thread.actionableItems.length,
    activityTime: thread.activityTime,
    attempts,
    completedAttemptCount: thread.completedAttemptCount,
    createdAt: thread.createdAt,
    tasteGoalLabel: thread.tasteGoalLabel,
    terminalSummary: thread.terminalSummary,
    threadId: thread.threadId,
    unstartedPlans,
  };
}

export function buildHistoryCoffeeGroups(
  summaries: readonly DialInThreadSummary[],
): HistoryCoffeeGroup[] {
  const groups = new Map<string, HistoryCoffeeGroup>();

  summaries.forEach((summary) => {
    const thread = toHistoryThread(summary);
    if (!thread) return;
    const group = groups.get(summary.coffeeId);
    if (group) {
      group.threads.push(thread);
      if (compareTimeDescending(thread.activityTime, group.activityTime) < 0) {
        group.activityTime = thread.activityTime;
      }
      return;
    }
    groups.set(summary.coffeeId, {
      activityTime: thread.activityTime,
      coffeeId: summary.coffeeId,
      coffeeName: summary.coffeeName,
      coffeeStatus: summary.coffeeStatus,
      threads: [thread],
    });
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      threads: group.threads.sort((left, right) => (
        compareTimeDescending(left.activityTime, right.activityTime)
        || right.threadId.localeCompare(left.threadId)
      )),
    }))
    .sort((left, right) => (
      compareTimeDescending(left.activityTime, right.activityTime)
      || right.coffeeId.localeCompare(left.coffeeId)
    ));
}
