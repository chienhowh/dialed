import { describe, expect, test } from "vitest";

import { assembleDialInThreadSummaries } from "./model";
import { buildHistoryCoffeeGroups } from "./history";
import type {
  DialInHistoryDecisionRecord,
  DialInHistoryFeedbackRecord,
  DialInHistoryPlanRecord,
  DialInHistorySessionRecord,
  DialInHistorySource,
} from "./types";

const userId = "owner";

function createPlan(overrides: Partial<DialInHistoryPlanRecord> = {}): DialInHistoryPlanRecord {
  return {
    basedOnSessionId: null,
    coffeeDose: 15,
    coffeeId: "coffee-a",
    createdAt: "2026-01-01T00:00:00.000Z",
    dialInThreadId: "thread-a",
    grindLevel: "medium-fine",
    id: "plan-a",
    parentPlanId: null,
    ratio: 16,
    recommendationSource: "official_rule",
    recipeTemplateId: "recipe-a",
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
    actualBrewTime: 165,
    brewPlanId: "plan-a",
    createdAt: "2026-01-02T10:00:00.000Z",
    finishedAt: "2026-01-02T10:03:00.000Z",
    id: "session-a",
    startedAt: "2026-01-02T10:00:00.000Z",
    status: "completed",
    userId,
    ...overrides,
  };
}

function createFeedback(overrides: Partial<DialInHistoryFeedbackRecord> = {}): DialInHistoryFeedbackRecord {
  return {
    acidity: 4,
    body: null,
    brewSessionId: "session-a",
    clarity: null,
    complexity: null,
    createdAt: "2026-01-02T10:05:00.000Z",
    flavorTags: ["Citrus"],
    id: "feedback-a",
    juiciness: null,
    notes: "Still sharp.",
    overallRating: 3,
    quickFeedback: ["too_sour"],
    sweetness: 2,
    userId,
    ...overrides,
  };
}

const grindFiner = {
  changeDirection: "finer",
  evidenceClassification: "product_heuristic",
  parameter: "grind",
  reason: "Test recommendation.",
} as const;

function createDecision(overrides: Partial<DialInHistoryDecisionRecord> = {}): DialInHistoryDecisionRecord {
  return {
    appliedBrewPlanId: null,
    createdAt: "2026-01-02T10:06:00.000Z",
    id: "decision-a",
    inferredDirections: ["increase_extraction"],
    recommendedCandidate: grindFiner,
    selectedCandidate: grindFiner,
    selectedDirection: "increase_extraction",
    status: "pending",
    tasteFeedbackId: "feedback-a",
    userId,
    ...overrides,
  };
}

function createSource(): DialInHistorySource {
  return {
    coffees: [{ displayName: "Coffee A", id: "coffee-a", status: "active", userId }],
    decisions: [],
    feedback: [],
    plans: [createPlan()],
    recipeTemplates: [{ id: "recipe-a", name: "Three Pour" }],
    sessions: [],
    threads: [{
      coffeeId: "coffee-a",
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "thread-a",
      primaryTasteGoal: "bright",
      secondaryTasteGoal: null,
      updatedAt: "2099-01-01T00:00:00.000Z",
      userId,
    }],
  };
}

function build(source: DialInHistorySource) {
  return buildHistoryCoffeeGroups(assembleDialInThreadSummaries(userId, source));
}

function onlyThread(source: DialInHistorySource) {
  const thread = build(source)[0]?.threads[0];
  if (!thread) throw new Error("Expected one History Thread.");
  return thread;
}

describe("History presentation model", () => {
  test("labels one Session as Brew #1", () => {
    const source = createSource();
    source.sessions.push(createSession());
    expect(onlyThread(source).attempts[0]?.attemptNumber).toBe(1);
  });

  test("keeps multiple Sessions from one Plan as separate attempts", () => {
    const source = createSource();
    source.sessions.push(createSession(), createSession({ id: "session-b" }));
    expect(onlyThread(source).attempts).toHaveLength(2);
  });

  test("numbers attempts chronologically oldest to newest", () => {
    const source = createSource();
    source.sessions.push(
      createSession({ id: "new", startedAt: "2026-01-04T00:00:00.000Z" }),
      createSession({ id: "old", startedAt: "2026-01-03T00:00:00.000Z" }),
    );
    expect(onlyThread(source).attempts.map(({ attemptNumber, sessionId }) => `${attemptNumber}:${sessionId}`)).toEqual(["1:old", "2:new"]);
  });

  test("attaches Feedback only to its Session attempt", () => {
    const source = createSource();
    source.sessions.push(createSession(), createSession({ id: "session-b" }));
    source.feedback.push(createFeedback());
    expect(onlyThread(source).attempts.map(({ feedback, sessionId }) => [sessionId, feedback?.id ?? null])).toEqual([
      ["session-a", "feedback-a"],
      ["session-b", null],
    ]);
  });

  test("attaches Decision only through its Feedback and Session", () => {
    const source = createSource();
    source.sessions.push(createSession(), createSession({ id: "session-b" }));
    source.feedback.push(createFeedback());
    source.decisions.push(createDecision());
    expect(onlyThread(source).attempts.map(({ decision }) => decision?.id ?? null)).toEqual(["decision-a", null]);
  });

  test("attaches an applied Next Plan to the exact source Session", () => {
    const source = createSource();
    source.sessions.push(createSession());
    source.feedback.push(createFeedback());
    source.decisions.push(createDecision({ appliedBrewPlanId: "plan-b", status: "applied" }));
    source.plans.push(createPlan({ basedOnSessionId: "session-a", id: "plan-b", parentPlanId: "plan-a", recommendationSource: "previous_brew_adjustment" }));
    expect(onlyThread(source).attempts[0]?.adjustment?.appliedPlanHref).toBe("/brew/plan-b");
  });

  test("preserves held as a displayable terminal Decision", () => {
    const source = createSource();
    source.sessions.push(createSession());
    source.feedback.push(createFeedback());
    source.decisions.push(createDecision({ recommendedCandidate: null, selectedCandidate: null, selectedDirection: "hold", status: "held" }));
    expect(onlyThread(source).attempts[0]?.adjustment?.status).toBe("held");
  });

  test("preserves unsupported as a displayable terminal Decision", () => {
    const source = createSource();
    source.sessions.push(createSession());
    source.feedback.push(createFeedback());
    source.decisions.push(createDecision({ recommendedCandidate: null, selectedCandidate: null, status: "unsupported" }));
    expect(onlyThread(source).attempts[0]?.adjustment?.status).toBe("unsupported");
  });

  test("shows aborted Sessions and offers Brew Again", () => {
    const source = createSource();
    source.sessions.push(createSession({ actualBrewTime: null, finishedAt: null, status: "aborted" }));
    expect(onlyThread(source).attempts[0]).toMatchObject({ brewAgainHref: "/brew/plan-a", status: "aborted" });
  });

  test("attaches Give Feedback recovery to a completed attempt", () => {
    const source = createSource();
    source.sessions.push(createSession());
    expect(onlyThread(source).attempts[0]?.recoveryAction?.kind).toBe("needs_feedback");
  });

  test("attaches Choose Adjustment recovery to the correct attempt", () => {
    const source = createSource();
    source.sessions.push(createSession());
    source.feedback.push(createFeedback());
    expect(onlyThread(source).attempts[0]?.recoveryAction?.kind).toBe("needs_adjustment_decision");
  });

  test("attaches pending Decision recovery while retaining Brew Again", () => {
    const source = createSource();
    source.sessions.push(createSession());
    source.feedback.push(createFeedback());
    source.decisions.push(createDecision());
    expect(onlyThread(source).attempts[0]).toMatchObject({
      brewAgainHref: "/brew/plan-a",
      recoveryAction: { kind: "pending_adjustment" },
    });
  });

  test("presents an applied unstarted Plan as Next brew ready", () => {
    const source = createSource();
    source.sessions.push(createSession());
    source.feedback.push(createFeedback());
    source.decisions.push(createDecision({ appliedBrewPlanId: "plan-b", status: "applied" }));
    source.plans.push(createPlan({ basedOnSessionId: "session-a", id: "plan-b", parentPlanId: "plan-a", recommendationSource: "previous_brew_adjustment" }));
    expect(onlyThread(source).unstartedPlans[0]?.action.kind).toBe("next_plan_ready");
  });

  test("renders an initial unstarted Plan separately without a fake attempt", () => {
    const thread = onlyThread(createSource());
    expect(thread.attempts).toEqual([]);
    expect(thread.unstartedPlans).toHaveLength(1);
    expect(thread.unstartedPlans[0]?.action.kind).toBe("ready_to_brew");
  });

  test("labels a manually edited applied Plan", () => {
    const source = createSource();
    source.sessions.push(createSession());
    source.feedback.push(createFeedback());
    source.decisions.push(createDecision({ appliedBrewPlanId: "plan-b", status: "applied" }));
    source.plans.push(createPlan({ basedOnSessionId: "session-a", id: "plan-b", parentPlanId: "plan-a", recommendationSource: "manual" }));
    expect(onlyThread(source).attempts[0]?.adjustment?.appliedPlanWasManuallyEdited).toBe(true);
  });

  test("keeps branches attached to their causal Sessions without a false chain", () => {
    const source = createSource();
    source.sessions.push(createSession(), createSession({ id: "session-b", startedAt: "2026-01-03T00:00:00.000Z" }));
    source.feedback.push(createFeedback(), createFeedback({ brewSessionId: "session-b", id: "feedback-b" }));
    source.decisions.push(
      createDecision({ appliedBrewPlanId: "plan-b", status: "applied" }),
      createDecision({ appliedBrewPlanId: "plan-c", id: "decision-b", status: "applied", tasteFeedbackId: "feedback-b" }),
    );
    source.plans.push(
      createPlan({ basedOnSessionId: "session-a", id: "plan-b", parentPlanId: "plan-a", recommendationSource: "previous_brew_adjustment" }),
      createPlan({ basedOnSessionId: "session-b", id: "plan-c", parentPlanId: "plan-a", recommendationSource: "previous_brew_adjustment" }),
    );
    expect(onlyThread(source).attempts.map(({ adjustment, sessionId }) => [sessionId, adjustment?.appliedPlanHref])).toEqual([
      ["session-a", "/brew/plan-b"],
      ["session-b", "/brew/plan-c"],
    ]);
  });

  test("orders Coffee and Thread groups by latest derived activity", () => {
    const source = createSource();
    source.coffees.push({ displayName: "Coffee B", id: "coffee-b", status: "active", userId });
    source.threads.push({ ...source.threads[0]!, coffeeId: "coffee-b", createdAt: "2026-02-01T00:00:00.000Z", id: "thread-b" });
    source.plans.push(createPlan({ coffeeId: "coffee-b", createdAt: "2026-02-02T00:00:00.000Z", dialInThreadId: "thread-b", id: "plan-b" }));
    expect(build(source).map(({ coffeeId }) => coffeeId)).toEqual(["coffee-b", "coffee-a"]);
  });

  test("uses stable IDs to break tied attempt timestamps", () => {
    const source = createSource();
    source.sessions.push(createSession({ id: "session-b" }), createSession({ id: "session-a" }));
    expect(onlyThread(source).attempts.map(({ sessionId }) => sessionId)).toEqual(["session-a", "session-b"]);
  });

  test("marks only immediately repeated Plans as the same as previous", () => {
    const source = createSource();
    source.plans.push(createPlan({ id: "plan-b" }));
    source.sessions.push(
      createSession(),
      createSession({ id: "session-b", startedAt: "2026-01-03T00:00:00.000Z" }),
      createSession({ brewPlanId: "plan-b", id: "session-c", startedAt: "2026-01-04T00:00:00.000Z" }),
    );
    expect(onlyThread(source).attempts.map(({ samePlanAsPrevious }) => samePlanAsPrevious)).toEqual([false, true, false]);
  });

  test("uses a bulk-loaded Recipe Template identity label", () => {
    const source = createSource();
    source.sessions.push(createSession());
    expect(onlyThread(source).attempts[0]?.plan.recipeTemplateName).toBe("Three Pour");
  });
});
