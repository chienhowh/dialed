import { describe, expect, it } from "vitest";

import type { BrewPlan } from "@/features/brew-plan/types";

import { createGuidedBrewPlanSnapshot } from "./plan";

describe("Guided Brew Plan snapshot", () => {
  it("copies persisted Brew Plan steps rather than Recipe Template steps", () => {
    const persistedStep = {
      duration: null,
      id: "persisted-step",
      note: "Edited bloom",
      startTime: 0,
      stepOrder: 1,
      stepType: "pour" as const,
      targetWater: 45,
    };
    const brewPlan = {
      coffee: { productName: "Snapshot Coffee" },
      coffeeDose: 15,
      grindLevel: "medium-fine",
      id: "plan-id",
      primaryTasteGoal: "sweet",
      ratio: 16,
      recipeName: "Three Pour",
      secondaryTasteGoal: null,
      steps: [persistedStep],
      targetBrewTimeMax: 160,
      targetBrewTimeMin: 135,
      waterAmount: 240,
      waterTemperature: 92,
    } as BrewPlan;

    const snapshot = createGuidedBrewPlanSnapshot(brewPlan);
    persistedStep.targetWater = 99;

    expect(snapshot.steps).toEqual([{ ...persistedStep, targetWater: 45 }]);
    expect(snapshot.steps[0]).not.toBe(persistedStep);
  });
});
