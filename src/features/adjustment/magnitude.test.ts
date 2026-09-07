import { describe, expect, it } from "vitest";

import type { AdjustmentCandidateSnapshot, AdjustmentDecision, AdjustmentDirection } from "./types";
import {
  ADJUSTMENT_MAGNITUDE_VERSION,
  type AdjustmentSourcePlan,
  resolveAdjustmentMagnitude,
} from "./magnitude";

const candidate = (
  parameter: AdjustmentCandidateSnapshot["parameter"],
  changeDirection: AdjustmentCandidateSnapshot["changeDirection"],
): AdjustmentCandidateSnapshot => ({
  changeDirection,
  evidenceClassification: "product_heuristic",
  parameter,
  reason: "Test candidate.",
});

function createDecision(
  selectedDirection: AdjustmentDirection,
  selectedCandidate: AdjustmentCandidateSnapshot,
): AdjustmentDecision {
  return {
    appliedBrewPlanId: null,
    candidateKnowledgeVersion: "candidate-catalog-v1",
    createdAt: "2026-09-07T00:00:00.000Z",
    id: "decision-1",
    inferredDirections: [selectedDirection],
    interpretationVersion: "feedback-interpretation-v1",
    recommendedCandidate: candidate("grind", "finer"),
    selectedCandidate,
    selectedDirection,
    status: "pending",
    tasteFeedbackId: "feedback-1",
  };
}

function createSourcePlan(overrides: Partial<AdjustmentSourcePlan> = {}): AdjustmentSourcePlan {
  return {
    coffeeDose: 15,
    coffeeId: "coffee-1",
    dialInThreadId: "thread-1",
    expectedFlavor: "Sweet and clean",
    grindLevel: "medium",
    ratio: 16,
    recipeTemplateId: "recipe-1",
    recommendationReason: "Original reason",
    sourcePlanId: "plan-1",
    steps: [
      { duration: 10, note: "First", sourceStepId: "step-1", startTime: 0, stepOrder: 1, stepType: "pour", targetWater: 60 },
      { duration: 20, note: "Wait", sourceStepId: "step-2", startTime: 10, stepOrder: 2, stepType: "wait", targetWater: null },
      { duration: null, note: "Second", sourceStepId: "step-3", startTime: 30, stepOrder: 3, stepType: "pour", targetWater: 120 },
      { duration: null, note: "Third", sourceStepId: "step-4", startTime: 60, stepOrder: 4, stepType: "pour", targetWater: 180 },
      { duration: null, note: "Final", sourceStepId: "step-5", startTime: 90, stepOrder: 5, stepType: "pour", targetWater: 240 },
    ],
    targetBrewTimeMax: 160,
    targetBrewTimeMin: 135,
    waterAmount: 240,
    waterTemperature: 92,
    ...overrides,
  };
}

function resolve(
  decision: AdjustmentDecision,
  sourcePlan: AdjustmentSourcePlan = createSourcePlan(),
  magnitudeVersion = ADJUSTMENT_MAGNITUDE_VERSION,
) {
  return resolveAdjustmentMagnitude({ decision, magnitudeVersion, sourcePlan });
}

describe("M7 grind magnitude", () => {
  it.each([
    ["medium", "finer", "medium-fine"],
    ["medium-fine", "finer", "fine"],
    ["medium", "coarser", "medium-coarse"],
    ["medium-coarse", "coarser", "coarse"],
  ] as const)("moves %s one adjacent level %s", (grindLevel, direction, expected) => {
    const selectedDirection = direction === "finer" ? "increase_extraction" : "decrease_extraction";
    const result = resolve(createDecision(selectedDirection, candidate("grind", direction)), createSourcePlan({ grindLevel }));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.nextPlan.grindLevel).toBe(expected);
      expect(result.nextPlan.steps).toEqual(createSourcePlan({ grindLevel }).steps);
    }
  });

  it.each([
    ["fine", "finer", "increase_extraction"],
    ["coarse", "coarser", "decrease_extraction"],
  ] as const)("returns a typed boundary failure for %s + %s", (grindLevel, direction, selectedDirection) => {
    expect(resolve(
      createDecision(selectedDirection, candidate("grind", direction)),
      createSourcePlan({ grindLevel }),
    )).toEqual({ reason: "grind_boundary", success: false });
  });

  it("rejects arbitrary grind text without fuzzy conversion", () => {
    expect(resolve(
      createDecision("increase_extraction", candidate("grind", "finer")),
      createSourcePlan({ grindLevel: "Comandante 22" }),
    )).toEqual({ reason: "unsupported_grind_value", success: false });
  });
});

describe("M7 temperature magnitude", () => {
  it.each([
    [92, "higher", 93, "increase_extraction"],
    [92, "lower", 91, "decrease_extraction"],
  ] as const)("moves %i°C %s by exactly one degree", (waterTemperature, direction, expected, selectedDirection) => {
    const sourcePlan = createSourcePlan({ waterTemperature });
    const result = resolve(createDecision(selectedDirection, candidate("temperature", direction)), sourcePlan);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.nextPlan.waterTemperature).toBe(expected);
      expect(result.nextPlan.grindLevel).toBe(sourcePlan.grindLevel);
      expect(result.nextPlan.steps).toEqual(sourcePlan.steps);
    }
  });

  it.each([
    [100, "higher", "increase_extraction"],
    [1, "lower", "decrease_extraction"],
  ] as const)("does not clamp %i°C + %s", (waterTemperature, direction, selectedDirection) => {
    expect(resolve(
      createDecision(selectedDirection, candidate("temperature", direction)),
      createSourcePlan({ waterTemperature }),
    )).toEqual({ reason: "temperature_boundary", success: false });
  });
});

describe("M7 water magnitude and plan cloning", () => {
  it.each([
    ["lower", "increase_strength", 15, 225],
    ["higher", "decrease_strength", 17, 255],
  ] as const)("resolves water %s through a one-point ratio step", (direction, selectedDirection, expectedRatio, expectedWater) => {
    const sourcePlan = createSourcePlan();
    const result = resolve(createDecision(selectedDirection, candidate("water", direction)), sourcePlan);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.nextPlan).toMatchObject({
        coffeeDose: 15,
        coffeeId: sourcePlan.coffeeId,
        dialInThreadId: sourcePlan.dialInThreadId,
        expectedFlavor: sourcePlan.expectedFlavor,
        magnitudeVersion: ADJUSTMENT_MAGNITUDE_VERSION,
        ratio: expectedRatio,
        recipeTemplateId: sourcePlan.recipeTemplateId,
        recommendationReason: sourcePlan.recommendationReason,
        recommendationSource: "previous_brew_adjustment",
        sourcePlanId: sourcePlan.sourcePlanId,
        targetBrewTimeMax: sourcePlan.targetBrewTimeMax,
        targetBrewTimeMin: sourcePlan.targetBrewTimeMin,
        waterAmount: expectedWater,
      });
      expect(sourcePlan).toEqual(createSourcePlan());
    }
  });

  it("rescales cumulative Pour targets, preserves Wait steps, and forces the final Pour to total water", () => {
    const result = resolve(createDecision("increase_strength", candidate("water", "lower")));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.nextPlan.steps.map(({ targetWater }) => targetWater)).toEqual([56.3, null, 112.5, 168.8, 225]);
      expect(result.nextPlan.steps[1]).toEqual(createSourcePlan().steps[1]);
      expect(result.nextPlan.steps.map(({ duration, note, sourceStepId, startTime, stepOrder, stepType }) => ({
        duration,
        note,
        sourceStepId,
        startTime,
        stepOrder,
        stepType,
      }))).toEqual(createSourcePlan().steps.map(({ duration, note, sourceStepId, startTime, stepOrder, stepType }) => ({
        duration,
        note,
        sourceStepId,
        startTime,
        stepOrder,
        stepType,
      })));
    }
  });

  it("uses stored ratio as baseline and stored water only as the rescaling baseline", () => {
    const sourcePlan = createSourcePlan({
      waterAmount: 250,
      steps: createSourcePlan().steps.map((step) => (
        step.stepType === "pour" && step.targetWater !== null
          ? { ...step, targetWater: step.targetWater * (250 / 240) }
          : step
      )),
    });
    const result = resolve(createDecision("increase_strength", candidate("water", "lower")), sourcePlan);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.nextPlan.ratio).toBe(15);
      expect(result.nextPlan.waterAmount).toBe(225);
      expect(result.nextPlan.steps.at(-1)?.targetWater).toBe(225);
    }
  });

  it("rounds derived water deterministically to two decimals", () => {
    const result = resolve(
      createDecision("decrease_strength", candidate("water", "higher")),
      createSourcePlan({ coffeeDose: 15.13, ratio: 16.25 }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.nextPlan.ratio).toBe(17.25);
      expect(result.nextPlan.waterAmount).toBe(260.99);
      expect(result.nextPlan.steps.at(-1)?.targetWater).toBe(260.99);
    }
  });

  it("returns typed failures for invalid ratio/water and step results", () => {
    expect(resolve(
      createDecision("increase_strength", candidate("water", "lower")),
      createSourcePlan({ ratio: 1 }),
    )).toEqual({ reason: "invalid_water_result", success: false });

    const invalidSteps = createSourcePlan().steps.map((step) => (
      step.sourceStepId === "step-3" ? { ...step, targetWater: 30 } : step
    ));
    expect(resolve(
      createDecision("increase_strength", candidate("water", "lower")),
      createSourcePlan({ steps: invalidSteps }),
    )).toEqual({ reason: "invalid_step_rescale", success: false });
  });
});

describe("M7 compatibility and historical selection", () => {
  it("uses selected candidate rather than recommended candidate", () => {
    const decision = createDecision("increase_extraction", candidate("temperature", "higher"));
    const result = resolve(decision);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.nextPlan.waterTemperature).toBe(93);
      expect(result.nextPlan.grindLevel).toBe("medium");
    }
  });

  it("rejects incompatible candidate and magnitude versions", () => {
    expect(resolve({
      ...createDecision("increase_extraction", candidate("grind", "finer")),
      candidateKnowledgeVersion: "candidate-catalog-v2",
    })).toEqual({ reason: "incompatible_candidate_version", success: false });

    expect(resolve(
      createDecision("increase_extraction", candidate("grind", "finer")),
      createSourcePlan(),
      "adjustment-magnitude-v2",
    )).toEqual({ reason: "incompatible_magnitude_version", success: false });
  });

  it("rejects a candidate that does not belong to the persisted selected direction", () => {
    expect(resolve(createDecision("increase_strength", candidate("temperature", "higher"))))
      .toEqual({ reason: "unsupported_candidate", success: false });
  });
});
