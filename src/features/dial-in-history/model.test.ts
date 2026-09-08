import { describe, expect, test } from "vitest";

import { assembleDialInThreadSummaries, getHomeDialInShortcuts } from "./model";
import type {
  DialInHistoryDecisionRecord,
  DialInHistoryFeedbackRecord,
  DialInHistoryPlanRecord,
  DialInHistorySessionRecord,
  DialInHistorySource,
} from "./types";

const userId = "owner";
const coffeeId = "coffee-1";
const threadId = "thread-1";
const planId = "plan-1";

function createSource(): DialInHistorySource {
  return {
    coffees: [{ displayName: "Ethiopia Guji", id: coffeeId, status: "active", userId }],
    decisions: [],
    feedback: [],
    plans: [createPlan()],
    recipeTemplates: [{ id: "recipe-1", name: "Three Pour" }],
    sessions: [],
    threads: [{
      coffeeId,
      createdAt: "2026-01-01T00:00:00.000Z",
      id: threadId,
      primaryTasteGoal: "bright",
      secondaryTasteGoal: null,
      updatedAt: "2099-01-01T00:00:00.000Z",
      userId,
    }],
  };
}

function createPlan(overrides: Partial<DialInHistoryPlanRecord> = {}): DialInHistoryPlanRecord {
  return {
    basedOnSessionId: null,
    coffeeDose: 15,
    coffeeId,
    createdAt: "2026-01-02T00:00:00.000Z",
    dialInThreadId: threadId,
    grindLevel: "medium-fine",
    id: planId,
    parentPlanId: null,
    ratio: 16,
    recommendationSource: "official_rule",
    recipeTemplateId: "recipe-1",
    targetBrewTimeMax: 180,
    targetBrewTimeMin: 150,
    userId,
    waterAmount: 240,
    waterTemperature: 92,
    ...overrides,
  };
}

function createSession(overrides: Partial<DialInHistorySessionRecord> = {}): DialInHistorySessionRecord {
  return {
    actualBrewTime: 160,
    brewPlanId: planId,
    createdAt: "2026-01-03T10:00:00.000Z",
    finishedAt: "2026-01-03T10:03:00.000Z",
    id: "session-1",
    startedAt: "2026-01-03T10:00:00.000Z",
    status: "completed",
    userId,
    ...overrides,
  };
}

function createFeedback(overrides: Partial<DialInHistoryFeedbackRecord> = {}): DialInHistoryFeedbackRecord {
  return {
    acidity: null,
    body: null,
    brewSessionId: "session-1",
    clarity: null,
    complexity: null,
    createdAt: "2026-01-03T10:05:00.000Z",
    flavorTags: [],
    id: "feedback-1",
    juiciness: null,
    notes: null,
    overallRating: 3,
    quickFeedback: ["too_sour"],
    sweetness: null,
    userId,
    ...overrides,
  };
}

function createDecision(overrides: Partial<DialInHistoryDecisionRecord> = {}): DialInHistoryDecisionRecord {
  return {
    appliedBrewPlanId: null,
    createdAt: "2026-01-03T10:06:00.000Z",
    id: "decision-1",
    inferredDirections: ["increase_extraction"],
    recommendedCandidate: {
      changeDirection: "finer",
      evidenceClassification: "product_heuristic",
      parameter: "grind",
      reason: "Test recommendation.",
    },
    selectedCandidate: {
      changeDirection: "finer",
      evidenceClassification: "product_heuristic",
      parameter: "grind",
      reason: "Test recommendation.",
    },
    selectedDirection: "increase_extraction",
    status: "pending",
    tasteFeedbackId: "feedback-1",
    userId,
    ...overrides,
  };
}

function onlyThread(source: DialInHistorySource) {
  const [thread] = assembleDialInThreadSummaries(userId, source);
  if (!thread) throw new Error("Expected one Dial-in Thread summary.");
  return thread;
}

describe("assembleDialInThreadSummaries", () => {
  test("derives ready_to_brew for a Plan without a Session", () => {
    const thread = onlyThread(createSource());
    expect(thread.actionableItems).toMatchObject([{
      href: `/brew/${planId}`,
      kind: "ready_to_brew",
    }]);
  });

  test("derives needs_feedback for a completed Session without Feedback", () => {
    const source = createSource();
    source.sessions.push(createSession());
    expect(onlyThread(source).actionableItems).toMatchObject([{
      href: `/brew/${planId}/session/session-1/feedback`,
      kind: "needs_feedback",
    }]);
  });

  test("derives needs_adjustment_decision for Feedback without a Decision", () => {
    const source = createSource();
    source.sessions.push(createSession());
    source.feedback.push(createFeedback());
    expect(onlyThread(source).actionableItems[0]?.kind).toBe("needs_adjustment_decision");
  });

  test("derives pending_adjustment for a pending Decision", () => {
    const source = createSource();
    source.sessions.push(createSession());
    source.feedback.push(createFeedback());
    source.decisions.push(createDecision());
    expect(onlyThread(source).actionableItems).toMatchObject([{
      href: `/brew/${planId}/session/session-1/feedback`,
      kind: "pending_adjustment",
    }]);
  });

  test("derives next_plan_ready for an applied Decision's unstarted Plan", () => {
    const source = createSource();
    source.sessions.push(createSession());
    source.feedback.push(createFeedback());
    source.decisions.push(createDecision({ appliedBrewPlanId: "plan-2", status: "applied" }));
    source.plans.push(createPlan({
      basedOnSessionId: "session-1",
      createdAt: "2026-01-03T10:06:00.000Z",
      id: "plan-2",
      parentPlanId: planId,
      recommendationSource: "previous_brew_adjustment",
    }));
    expect(onlyThread(source).actionableItems).toMatchObject([{
      href: "/brew/plan-2",
      kind: "next_plan_ready",
      planId: "plan-2",
    }]);
  });

  test.each([
    ["held", "dialed_in"],
    ["unsupported", "unsupported"],
  ] as const)("derives %s as the %s terminal summary", (decisionStatus, terminalKind) => {
    const source = createSource();
    source.sessions.push(createSession());
    source.feedback.push(createFeedback());
    source.decisions.push(createDecision({ status: decisionStatus }));
    const thread = onlyThread(source);
    expect(thread.actionableItems).toEqual([]);
    expect(thread.terminalSummary?.kind).toBe(terminalKind);
  });

  test("keeps an aborted Session historical without offering Feedback", () => {
    const source = createSource();
    source.sessions.push(createSession({
      actualBrewTime: null,
      finishedAt: "2026-01-03T10:01:00.000Z",
      status: "aborted",
    }));
    const thread = onlyThread(source);
    expect(thread.attempts).toHaveLength(1);
    expect(thread.completedAttemptCount).toBe(0);
    expect(thread.actionableItems).toEqual([]);
    expect(thread.terminalSummary?.kind).toBe("stopped");
  });

  test("shows DB-only brewing as non-actionable rather than resumable", () => {
    const source = createSource();
    source.sessions.push(createSession({
      actualBrewTime: null,
      finishedAt: null,
      status: "brewing",
    }));
    const thread = onlyThread(source);
    expect(thread.actionableItems).toEqual([]);
    expect(thread.terminalSummary?.kind).toBe("brewing");
  });

  test("keeps multiple Sessions from the same Plan as separate attempts", () => {
    const source = createSource();
    source.sessions.push(
      createSession(),
      createSession({ id: "session-2", startedAt: "2026-01-04T10:00:00.000Z", finishedAt: "2026-01-04T10:03:00.000Z" }),
    );
    const thread = onlyThread(source);
    expect(thread.attempts.map(({ sessionId }) => sessionId)).toEqual(["session-2", "session-1"]);
    expect(thread.attempts.every(({ plan }) => plan.id === planId)).toBe(true);
  });

  test("preserves every actionable item in one Thread", () => {
    const source = createSource();
    source.sessions.push(createSession());
    source.plans.push(createPlan({ id: "plan-2", createdAt: "2026-01-04T00:00:00.000Z" }));
    const thread = onlyThread(source);
    expect(thread.actionableItems.map(({ kind }) => kind)).toEqual(["needs_feedback", "ready_to_brew"]);
    expect(thread.actionableItems).toHaveLength(2);
  });

  test("orders actions by recovery priority, activity time, then stable ID", () => {
    const source = createSource();
    source.plans = [
      createPlan({ id: "ready-b", createdAt: "2026-01-10T00:00:00.000Z" }),
      createPlan({ id: "ready-a", createdAt: "2026-01-10T00:00:00.000Z" }),
      createPlan({ id: "plan-feedback" }),
      createPlan({ id: "plan-decision" }),
      createPlan({ id: "plan-pending" }),
    ];
    source.sessions = [
      createSession({ brewPlanId: "plan-feedback", id: "session-feedback" }),
      createSession({ brewPlanId: "plan-decision", id: "session-decision" }),
      createSession({ brewPlanId: "plan-pending", id: "session-pending" }),
    ];
    source.feedback = [
      createFeedback({ brewSessionId: "session-decision", id: "feedback-decision" }),
      createFeedback({ brewSessionId: "session-pending", id: "feedback-pending" }),
    ];
    source.decisions = [createDecision({ tasteFeedbackId: "feedback-pending" })];

    expect(onlyThread(source).actionableItems.map(({ kind, planId: actionPlanId }) => (
      `${kind}:${actionPlanId}`
    ))).toEqual([
      "needs_feedback:plan-feedback",
      "needs_adjustment_decision:plan-decision",
      "pending_adjustment:plan-pending",
      "ready_to_brew:ready-b",
      "ready_to_brew:ready-a",
    ]);
  });

  test("derives activity from children and ignores Thread.updated_at", () => {
    const thread = onlyThread(createSource());
    expect(thread.activityTime).toBe("2026-01-02T00:00:00.000Z");
    expect(thread.activityTime).not.toBe("2099-01-01T00:00:00.000Z");
  });

  test("attaches latest Feedback according to latest completed Session causality", () => {
    const source = createSource();
    source.sessions.push(
      createSession({ id: "older-session", finishedAt: "2026-01-04T10:03:00.000Z" }),
      createSession({ id: "latest-session", startedAt: "2026-01-05T10:00:00.000Z", finishedAt: "2026-01-05T10:03:00.000Z" }),
    );
    source.feedback.push(
      createFeedback({ brewSessionId: "older-session", createdAt: "2026-01-07T00:00:00.000Z", id: "late-submission" }),
      createFeedback({ brewSessionId: "latest-session", createdAt: "2026-01-06T00:00:00.000Z", id: "latest-cup-feedback", quickFeedback: ["pretty_good"] }),
    );
    expect(onlyThread(source).latestCompletedAttempt).toMatchObject({
      feedback: { id: "latest-cup-feedback", quickFeedback: ["pretty_good"] },
      sessionId: "latest-session",
    });
  });

  test("keeps branching attempts and generated Plan relationships distinct", () => {
    const source = createSource();
    source.sessions.push(
      createSession({ id: "session-a" }),
      createSession({ id: "session-b", startedAt: "2026-01-04T10:00:00.000Z", finishedAt: "2026-01-04T10:03:00.000Z" }),
    );
    source.feedback.push(
      createFeedback({ brewSessionId: "session-a", id: "feedback-a" }),
      createFeedback({ brewSessionId: "session-b", id: "feedback-b" }),
    );
    source.decisions.push(
      createDecision({ appliedBrewPlanId: "child-a", id: "decision-a", status: "applied", tasteFeedbackId: "feedback-a" }),
      createDecision({ appliedBrewPlanId: "child-b", id: "decision-b", status: "applied", tasteFeedbackId: "feedback-b" }),
    );
    source.plans.push(
      createPlan({ basedOnSessionId: "session-a", id: "child-a", parentPlanId: planId, recommendationSource: "previous_brew_adjustment" }),
      createPlan({ basedOnSessionId: "session-b", id: "child-b", parentPlanId: planId, recommendationSource: "previous_brew_adjustment" }),
    );
    const thread = onlyThread(source);
    expect(new Map(thread.attempts.map(({ generatedNextPlanId, sessionId }) => [sessionId, generatedNextPlanId]))).toEqual(new Map([
      ["session-a", "child-a"],
      ["session-b", "child-b"],
    ]));
    expect(thread.actionableItems.map(({ planId: actionPlanId }) => actionPlanId).sort()).toEqual(["child-a", "child-b"]);
  });

  test("excludes cross-owner records during assembly", () => {
    const source = createSource();
    source.coffees.push({ displayName: "Private Coffee", id: "other-coffee", status: "active", userId: "other" });
    source.threads.push({
      coffeeId: "other-coffee",
      createdAt: "2026-02-01T00:00:00.000Z",
      id: "other-thread",
      primaryTasteGoal: "sweet",
      secondaryTasteGoal: null,
      updatedAt: "2026-02-01T00:00:00.000Z",
      userId: "other",
    });
    expect(assembleDialInThreadSummaries(userId, source).map(({ coffeeName }) => coffeeName)).toEqual(["Ethiopia Guji"]);
  });
});

test("Home shows one primary shortcut per active Thread and reports additional work", () => {
  const source = createSource();
  source.sessions.push(createSession());
  source.plans.push(createPlan({ id: "plan-2" }));
  const shortcuts = getHomeDialInShortcuts(assembleDialInThreadSummaries(userId, source));
  expect(shortcuts).toMatchObject([{
    action: { kind: "needs_feedback" },
    additionalActionCount: 1,
    coffeeName: "Ethiopia Guji",
    tasteGoalLabel: "Bright",
  }]);
});
