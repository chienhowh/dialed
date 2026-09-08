import { formatTasteGoals } from "@/domain/taste/taste-goal";

import type {
  DialInActionableItem,
  DialInBrewAttempt,
  DialInDecisionSummary,
  DialInFeedbackSummary,
  DialInHistoryDecisionRecord,
  DialInHistorySource,
  DialInPlanSummary,
  DialInTerminalSummary,
  DialInThreadSummary,
  HomeDialInShortcut,
} from "./types";

const ACTION_PRIORITY = {
  needs_feedback: 0,
  needs_adjustment_decision: 1,
  pending_adjustment: 2,
  next_plan_ready: 3,
  ready_to_brew: 4,
} as const;

const ACTION_COPY = {
  needs_feedback: { ctaLabel: "Give Feedback", label: "Taste feedback needed" },
  needs_adjustment_decision: { ctaLabel: "Choose Adjustment", label: "Choose your next adjustment" },
  pending_adjustment: { ctaLabel: "Continue Dial-in", label: "Adjustment ready to apply" },
  next_plan_ready: { ctaLabel: "Review Next Brew", label: "Next brew ready" },
  ready_to_brew: { ctaLabel: "Review Brew Plan", label: "Brew Plan ready" },
} as const;

const TERMINAL_COPY = {
  brewing: "Brew in progress",
  dialed_in: "Dialed in",
  no_next_action: "No next action",
  stopped: "Brew stopped",
  unsupported: "No supported adjustment",
} as const;

function timestampValue(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function laterTimestamp(...values: Array<string | null | undefined>) {
  const timestamps = values.filter((value): value is string => Boolean(value));
  return timestamps.reduce((latest, value) => (
    timestampValue(value) > timestampValue(latest) ? value : latest
  ));
}

function compareIdDescending(left: string, right: string) {
  return right.localeCompare(left);
}

function compareTimeDescending(left: string, right: string) {
  return timestampValue(right) - timestampValue(left);
}

function comparePlans(
  left: { createdAt: string; id: string },
  right: { createdAt: string; id: string },
) {
  return compareTimeDescending(left.createdAt, right.createdAt) || compareIdDescending(left.id, right.id);
}

function compareAttempts(left: DialInBrewAttempt, right: DialInBrewAttempt) {
  return compareTimeDescending(left.startedAt, right.startedAt)
    || compareIdDescending(left.sessionId, right.sessionId);
}

function compareCompletedAttempts(left: DialInBrewAttempt, right: DialInBrewAttempt) {
  return compareTimeDescending(left.finishedAt ?? left.startedAt, right.finishedAt ?? right.startedAt)
    || compareTimeDescending(left.startedAt, right.startedAt)
    || compareIdDescending(left.sessionId, right.sessionId);
}

export function compareActionableItems(left: DialInActionableItem, right: DialInActionableItem) {
  return ACTION_PRIORITY[left.kind] - ACTION_PRIORITY[right.kind]
    || compareTimeDescending(left.activityTime, right.activityTime)
    || compareIdDescending(left.id, right.id);
}

function toPlanSummary(
  plan: DialInHistorySource["plans"][number],
  recipeTemplateNames: ReadonlyMap<string, string>,
): DialInPlanSummary {
  return {
    basedOnSessionId: plan.basedOnSessionId,
    coffeeDose: plan.coffeeDose,
    createdAt: plan.createdAt,
    grindLevel: plan.grindLevel,
    id: plan.id,
    parentPlanId: plan.parentPlanId,
    ratio: plan.ratio,
    recommendationSource: plan.recommendationSource,
    recipeTemplateId: plan.recipeTemplateId,
    recipeTemplateName: plan.recipeTemplateId
      ? recipeTemplateNames.get(plan.recipeTemplateId) ?? null
      : null,
    targetBrewTimeMax: plan.targetBrewTimeMax,
    targetBrewTimeMin: plan.targetBrewTimeMin,
    waterAmount: plan.waterAmount,
    waterTemperature: plan.waterTemperature,
  };
}

function toFeedbackSummary(feedback: DialInHistorySource["feedback"][number]): DialInFeedbackSummary {
  return {
    acidity: feedback.acidity,
    body: feedback.body,
    clarity: feedback.clarity,
    complexity: feedback.complexity,
    createdAt: feedback.createdAt,
    flavorTags: feedback.flavorTags,
    id: feedback.id,
    juiciness: feedback.juiciness,
    notes: feedback.notes,
    overallRating: feedback.overallRating,
    quickFeedback: feedback.quickFeedback,
    sweetness: feedback.sweetness,
  };
}

function toDecisionSummary(decision: DialInHistoryDecisionRecord): DialInDecisionSummary {
  return {
    appliedBrewPlanId: decision.appliedBrewPlanId,
    createdAt: decision.createdAt,
    id: decision.id,
    inferredDirections: decision.inferredDirections,
    recommendedCandidate: decision.recommendedCandidate,
    selectedCandidate: decision.selectedCandidate,
    selectedDirection: decision.selectedDirection,
    status: decision.status,
  };
}

function createAction(input: {
  activityTime: string;
  id: string;
  kind: DialInActionableItem["kind"];
  planId: string;
  sessionId?: string;
}) {
  const copy = ACTION_COPY[input.kind];
  const href = input.sessionId
    ? `/brew/${input.planId}/session/${input.sessionId}/feedback`
    : `/brew/${input.planId}`;

  return {
    activityTime: input.activityTime,
    ctaLabel: copy.ctaLabel,
    href,
    id: `${input.kind}:${input.id}`,
    kind: input.kind,
    label: copy.label,
    planId: input.planId,
    sessionId: input.sessionId ?? null,
  } satisfies DialInActionableItem;
}

function createTerminalSummary(
  kind: DialInTerminalSummary["kind"],
  activityTime: string,
): DialInTerminalSummary {
  return { activityTime, kind, label: TERMINAL_COPY[kind] };
}

export function assembleDialInThreadSummaries(
  userId: string,
  source: DialInHistorySource,
): DialInThreadSummary[] {
  const coffees = new Map(source.coffees
    .filter((coffee) => coffee.userId === userId)
    .map((coffee) => [coffee.id, coffee]));
  const threads = source.threads.filter((thread) => thread.userId === userId && coffees.has(thread.coffeeId));
  const threadsById = new Map(threads.map((thread) => [thread.id, thread]));
  const threadIds = new Set(threads.map(({ id }) => id));
  const plans = source.plans.filter((plan) => (
    plan.userId === userId
    && threadIds.has(plan.dialInThreadId)
    && threadsById.get(plan.dialInThreadId)?.coffeeId === plan.coffeeId
  ));
  const plansById = new Map(plans.map((plan) => [plan.id, plan]));
  const recipeTemplateNames = new Map(source.recipeTemplates.map((template) => [template.id, template.name]));
  const sessions = source.sessions.filter((session) => (
    session.userId === userId && plansById.has(session.brewPlanId)
  ));
  const sessionsById = new Map(sessions.map((session) => [session.id, session]));
  const feedback = source.feedback.filter((item) => (
    item.userId === userId && sessionsById.has(item.brewSessionId)
  ));
  const feedbackBySessionId = new Map(feedback.map((item) => [item.brewSessionId, item]));
  const feedbackById = new Map(feedback.map((item) => [item.id, item]));
  const feedbackIds = new Set(feedback.map(({ id }) => id));
  const decisions = source.decisions.filter((decision) => (
    decision.userId === userId && feedbackIds.has(decision.tasteFeedbackId)
  ));
  const decisionsByFeedbackId = new Map(decisions.map((decision) => [decision.tasteFeedbackId, decision]));
  const appliedDecisionsByPlanId = new Map(decisions.flatMap((decision) => {
    if (decision.status !== "applied" || !decision.appliedBrewPlanId) return [];
    const feedbackRecord = feedbackById.get(decision.tasteFeedbackId);
    const sourceSession = feedbackRecord ? sessionsById.get(feedbackRecord.brewSessionId) : null;
    const sourcePlan = sourceSession ? plansById.get(sourceSession.brewPlanId) : null;
    const appliedPlan = plansById.get(decision.appliedBrewPlanId);
    if (
      !sourceSession
      || !sourcePlan
      || !appliedPlan
      || appliedPlan.dialInThreadId !== sourcePlan.dialInThreadId
      || appliedPlan.basedOnSessionId !== sourceSession.id
    ) return [];
    return [[decision.appliedBrewPlanId, decision] as const];
  }));

  return threads.map((thread) => {
    const coffee = coffees.get(thread.coffeeId);
    if (!coffee) throw new Error("Dial-in Thread Coffee is unavailable.");

    const threadPlans = plans
      .filter((plan) => plan.dialInThreadId === thread.id)
      .sort(comparePlans);
    const planIds = new Set(threadPlans.map(({ id }) => id));
    const threadSessions = sessions.filter((session) => planIds.has(session.brewPlanId));
    const sessionCountByPlanId = new Map<string, number>();
    threadSessions.forEach((session) => {
      sessionCountByPlanId.set(session.brewPlanId, (sessionCountByPlanId.get(session.brewPlanId) ?? 0) + 1);
    });

    const attempts = threadSessions.map((session): DialInBrewAttempt => {
      const plan = plansById.get(session.brewPlanId);
      if (!plan) throw new Error("Brew attempt Plan is unavailable.");
      const feedbackRecord = feedbackBySessionId.get(session.id) ?? null;
      const decisionRecord = feedbackRecord ? decisionsByFeedbackId.get(feedbackRecord.id) ?? null : null;
      const generatedNextPlanId = decisionRecord?.status === "applied"
        && decisionRecord.appliedBrewPlanId
        && planIds.has(decisionRecord.appliedBrewPlanId)
        ? decisionRecord.appliedBrewPlanId
        : null;
      const generatedNextPlan = generatedNextPlanId ? plansById.get(generatedNextPlanId) ?? null : null;

      return {
        actualBrewTime: session.actualBrewTime,
        activityTime: laterTimestamp(
          session.startedAt,
          session.finishedAt,
          feedbackRecord?.createdAt,
          decisionRecord?.createdAt,
        ),
        decision: decisionRecord ? toDecisionSummary(decisionRecord) : null,
        feedback: feedbackRecord ? toFeedbackSummary(feedbackRecord) : null,
        finishedAt: session.finishedAt,
        generatedNextPlanId,
        generatedNextPlanWasManuallyEdited: generatedNextPlan?.recommendationSource === "manual",
        plan: toPlanSummary(plan, recipeTemplateNames),
        sessionId: session.id,
        startedAt: session.startedAt,
        status: session.status,
      };
    }).sort(compareAttempts);

    const actionableItems: DialInActionableItem[] = [];
    threadPlans.forEach((plan) => {
      if ((sessionCountByPlanId.get(plan.id) ?? 0) > 0) return;
      const appliedDecision = appliedDecisionsByPlanId.get(plan.id);
      actionableItems.push(createAction({
        activityTime: laterTimestamp(plan.createdAt, appliedDecision?.createdAt),
        id: plan.id,
        kind: appliedDecision ? "next_plan_ready" : "ready_to_brew",
        planId: plan.id,
      }));
    });

    attempts.forEach((attempt) => {
      if (attempt.status !== "completed") return;
      if (!attempt.feedback) {
        actionableItems.push(createAction({
          activityTime: attempt.finishedAt ?? attempt.startedAt,
          id: attempt.sessionId,
          kind: "needs_feedback",
          planId: attempt.plan.id,
          sessionId: attempt.sessionId,
        }));
        return;
      }
      if (!attempt.decision) {
        actionableItems.push(createAction({
          activityTime: attempt.feedback.createdAt,
          id: attempt.sessionId,
          kind: "needs_adjustment_decision",
          planId: attempt.plan.id,
          sessionId: attempt.sessionId,
        }));
        return;
      }
      if (attempt.decision.status === "pending") {
        actionableItems.push(createAction({
          activityTime: attempt.decision.createdAt,
          id: attempt.sessionId,
          kind: "pending_adjustment",
          planId: attempt.plan.id,
          sessionId: attempt.sessionId,
        }));
      }
    });
    actionableItems.sort(compareActionableItems);

    const completedAttempts = attempts.filter((attempt) => attempt.status === "completed");
    const latestCompletedAttempt = [...completedAttempts].sort(compareCompletedAttempts)[0] ?? null;
    let terminalSummary: DialInTerminalSummary | null = null;
    if (actionableItems.length === 0) {
      const latestAttempt = attempts[0] ?? null;
      if (
        latestAttempt?.status === "brewing"
        && (!latestCompletedAttempt
          || timestampValue(latestAttempt.startedAt) > timestampValue(latestCompletedAttempt.finishedAt ?? latestCompletedAttempt.startedAt))
      ) {
        terminalSummary = createTerminalSummary("brewing", latestAttempt.activityTime);
      } else if (
        latestAttempt?.status === "aborted"
        && (!latestCompletedAttempt
          || timestampValue(latestAttempt.startedAt) > timestampValue(latestCompletedAttempt.finishedAt ?? latestCompletedAttempt.startedAt))
      ) {
        terminalSummary = createTerminalSummary("stopped", latestAttempt.activityTime);
      } else if (latestCompletedAttempt?.decision?.status === "held") {
        terminalSummary = createTerminalSummary("dialed_in", latestCompletedAttempt.decision.createdAt);
      } else if (latestCompletedAttempt?.decision?.status === "unsupported") {
        terminalSummary = createTerminalSummary("unsupported", latestCompletedAttempt.decision.createdAt);
      } else {
        terminalSummary = createTerminalSummary("no_next_action", laterTimestamp(
          thread.createdAt,
          ...attempts.map(({ activityTime }) => activityTime),
          ...threadPlans.map(({ createdAt }) => createdAt),
        ));
      }
    }

    const activityTime = laterTimestamp(
      thread.createdAt,
      ...threadPlans.map(({ createdAt }) => createdAt),
      ...attempts.map(({ activityTime }) => activityTime),
    );

    return {
      actionableItems,
      activityTime,
      attempts,
      coffeeId: coffee.id,
      coffeeName: coffee.displayName,
      coffeeStatus: coffee.status,
      completedAttemptCount: completedAttempts.length,
      createdAt: thread.createdAt,
      latestCompletedAttempt,
      plans: threadPlans.map((plan) => toPlanSummary(plan, recipeTemplateNames)),
      primaryTasteGoal: thread.primaryTasteGoal,
      secondaryTasteGoal: thread.secondaryTasteGoal,
      tasteGoalLabel: formatTasteGoals(thread.primaryTasteGoal, thread.secondaryTasteGoal),
      terminalSummary,
      threadId: thread.id,
    };
  }).sort((left, right) => (
    compareTimeDescending(left.activityTime, right.activityTime)
    || compareIdDescending(left.threadId, right.threadId)
  ));
}

export function getHomeDialInShortcuts(threads: readonly DialInThreadSummary[]): HomeDialInShortcut[] {
  return threads
    .filter((thread) => thread.coffeeStatus === "active" && thread.actionableItems.length > 0)
    .map((thread) => ({
      action: thread.actionableItems[0],
      additionalActionCount: thread.actionableItems.length - 1,
      coffeeId: thread.coffeeId,
      coffeeName: thread.coffeeName,
      tasteGoalLabel: thread.tasteGoalLabel,
      threadId: thread.threadId,
    }))
    .sort((left, right) => (
      compareActionableItems(left.action, right.action)
      || compareIdDescending(left.threadId, right.threadId)
    ));
}
