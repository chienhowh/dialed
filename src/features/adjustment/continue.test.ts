import { describe, expect, it } from "vitest";

import { getCandidateSnapshotLabel } from "./config";
import {
  getAdjustmentFailureState,
  getAdjustmentResultPresentation,
  getUnexpectedApplyFailureState,
} from "./continue";
import type { AdjustmentDecision } from "./types";

function createDecision(overrides: Partial<AdjustmentDecision> = {}): AdjustmentDecision {
  return {
    appliedBrewPlanId: null,
    candidateKnowledgeVersion: "candidate-catalog-v1",
    createdAt: "2026-09-07T00:00:00.000Z",
    id: "decision-1",
    inferredDirections: ["increase_extraction"],
    interpretationVersion: "feedback-interpretation-v1",
    recommendedCandidate: {
      changeDirection: "finer",
      evidenceClassification: "product_heuristic",
      parameter: "grind",
      reason: "Grind finer.",
    },
    selectedCandidate: {
      changeDirection: "finer",
      evidenceClassification: "product_heuristic",
      parameter: "grind",
      reason: "Grind finer.",
    },
    selectedDirection: "increase_extraction",
    status: "pending",
    tasteFeedbackId: "feedback-1",
    ...overrides,
  };
}

describe("M7 terminal presentation", () => {
  it("offers Continue Dial-in only for a pending Decision with a selected Candidate", () => {
    expect(getAdjustmentResultPresentation(createDecision(), "Grind finer")).toEqual({
      action: "continue",
      candidateLabel: "Grind finer",
      title: "Adjustment saved",
    });
  });

  it.each([
    ["held", "Dialed in"],
    ["unsupported", "Direction saved"],
  ] as const)("does not offer Continue Dial-in for %s", (status, title) => {
    const decision = createDecision({
      candidateKnowledgeVersion: status === "held" ? null : "candidate-catalog-v1",
      recommendedCandidate: null,
      selectedCandidate: null,
      selectedDirection: status === "held" ? "hold" : "reduce_astringency",
      status,
    });

    expect(getAdjustmentResultPresentation(decision, "Saved adjustment")).toEqual({
      action: "done",
      title,
    });
  });

  it("uses the persisted applied Brew Plan pointer", () => {
    expect(getAdjustmentResultPresentation(createDecision({
      appliedBrewPlanId: "generated-plan-1",
      status: "applied",
    }), "Grind finer")).toEqual({
      action: "view_plan",
      brewPlanId: "generated-plan-1",
      title: "Next brew ready",
    });
  });

  it("reuses human-readable Candidate labels", () => {
    expect(getCandidateSnapshotLabel({ changeDirection: "finer", parameter: "grind" })).toBe("Grind finer");
    expect(getCandidateSnapshotLabel({ changeDirection: "higher", parameter: "temperature" }))
      .toBe("Increase water temperature");
    expect(getCandidateSnapshotLabel({ changeDirection: "lower", parameter: "water" })).toBe("Use less water");
    expect(getCandidateSnapshotLabel({ changeDirection: "higher", parameter: "water" })).toBe("Use more water");
  });
});

describe("M7 apply failure presentation", () => {
  it.each([
    ["unsupported_grind_value", "Current grind cannot be adjusted automatically."],
    ["grind_boundary", "This adjustment is already at Dialed’s supported limit."],
    ["temperature_boundary", "This adjustment is already at Dialed’s supported limit."],
    ["invalid_water_result", "This brew cannot be adjusted automatically with its current values."],
    ["invalid_step_rescale", "This brew cannot be adjusted automatically with its current values."],
    ["unsupported_candidate", "This saved adjustment cannot be applied automatically."],
    ["incompatible_candidate_version", "This saved adjustment cannot be applied automatically."],
    ["incompatible_magnitude_version", "This saved adjustment cannot be applied automatically."],
    ["decision_not_pending", "This adjustment is no longer pending. Refresh to see its current state."],
  ] as const)("maps %s to friendly non-retryable copy", (reason, message) => {
    expect(getAdjustmentFailureState(reason)).toEqual({ message, retryable: false });
  });

  it("keeps unexpected failures retryable without exposing implementation details", () => {
    expect(getUnexpectedApplyFailureState()).toEqual({
      message: "We could not prepare the next brew. Please try again.",
      retryable: true,
    });
  });
});
