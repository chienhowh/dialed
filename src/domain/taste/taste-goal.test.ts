import { describe, expect, it } from "vitest";

import { formatTasteGoals, getTasteGoalLabel, isTasteGoal } from "./taste-goal";

describe("taste goal contract", () => {
  it("accepts only canonical values", () => {
    expect(isTasteGoal("full_body")).toBe(true);
    expect(isTasteGoal("Full Body")).toBe(false);
    expect(isTasteGoal("sweetness")).toBe(false);
  });

  it("keeps display labels separate from stored values", () => {
    expect(getTasteGoalLabel("full_body")).toBe("Full Body");
    expect(formatTasteGoals("sweet", "clean")).toBe("Sweet + Clean");
    expect(formatTasteGoals("balanced", null)).toBe("Balanced");
  });
});
