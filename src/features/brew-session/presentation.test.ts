import { describe, expect, it } from "vitest";

import { getGuidedBrewStepPresentation, InvalidGuidedBrewPlanError } from "./presentation";
import type { GuidedBrewPlanSnapshot } from "./types";

const plan: GuidedBrewPlanSnapshot = {
  brewPlanId: "plan-1",
  coffeeDose: 15,
  coffeeName: "Presentation Coffee",
  grindLevel: "medium-fine",
  ratio: 16,
  recipeName: "One Pour",
  steps: [
    { duration: 10, id: "step-1", note: "Bloom", startTime: 0, stepOrder: 1, stepType: "pour", targetWater: 40 },
    { duration: 30, id: "step-2", note: "Wait for bloom", startTime: 10, stepOrder: 2, stepType: "wait", targetWater: null },
    { duration: 60, id: "step-3", note: "Single continuous pour", startTime: 40, stepOrder: 3, stepType: "pour", targetWater: 240 },
  ],
  targetBrewTimeMax: 150,
  targetBrewTimeMin: 120,
  tasteGoal: "Sweet",
  waterAmount: 240,
  waterTemperature: 92,
};

describe("Guided Brew presentation", () => {
  it("presents a Pour step with its cumulative Plan target", () => {
    expect(getGuidedBrewStepPresentation(plan, 0)).toMatchObject({
      actionLabel: "Next",
      instruction: "Bloom",
      stepNumber: 1,
      stepTypeLabel: "Pour",
      targetLabel: "Target water",
      targetValue: "40g",
      totalStepCount: 3,
    });
  });

  it("presents a Wait step with duration guidance", () => {
    expect(getGuidedBrewStepPresentation(plan, 1)).toMatchObject({
      instruction: "Wait for bloom",
      stepTypeLabel: "Wait",
      targetLabel: "Duration",
      targetValue: "0:30",
    });
  });

  it("previews the following step with timing and target", () => {
    expect(getGuidedBrewStepPresentation(plan, 1).nextStepPreview).toBe("0:40 · Pour to 240g");
  });

  it("replaces Next with Finish Brew on the final step", () => {
    expect(getGuidedBrewStepPresentation(plan, 2)).toMatchObject({
      actionLabel: "Finish Brew",
      isFinalStep: true,
      nextStepPreview: "Finish brew",
    });
  });

  it("rejects missing, out-of-order, and invalid Plan step data", () => {
    expect(() => getGuidedBrewStepPresentation({ ...plan, steps: [] }, 0)).toThrow(InvalidGuidedBrewPlanError);
    expect(() => getGuidedBrewStepPresentation({
      ...plan,
      steps: [{ ...plan.steps[0]!, stepOrder: 2 }],
    }, 0)).toThrow(InvalidGuidedBrewPlanError);
    expect(() => getGuidedBrewStepPresentation({
      ...plan,
      steps: [{ ...plan.steps[0]!, targetWater: null }],
    }, 0)).toThrow(InvalidGuidedBrewPlanError);
  });
});
