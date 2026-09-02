import { describe, expect, it } from "vitest";

import { parseTasteGoalFormData } from "./taste-goal-form";

function formData(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("parseTasteGoalFormData", () => {
  it("requires a canonical primary goal", () => {
    expect(parseTasteGoalFormData(formData({}))).toEqual({
      errors: { primaryTasteGoal: "Choose a primary taste goal." },
      success: false,
      values: { primaryTasteGoal: "", secondaryTasteGoal: "" },
    });
    expect(parseTasteGoalFormData(formData({ primaryTasteGoal: "Sweet" })).success).toBe(false);
  });

  it("accepts an optional canonical secondary goal", () => {
    expect(parseTasteGoalFormData(formData({ primaryTasteGoal: "sweet" }))).toEqual({
      data: { primaryTasteGoal: "sweet", secondaryTasteGoal: null },
      success: true,
    });
    expect(parseTasteGoalFormData(formData({
      primaryTasteGoal: "sweet",
      secondaryTasteGoal: "clean",
    }))).toEqual({
      data: { primaryTasteGoal: "sweet", secondaryTasteGoal: "clean" },
      success: true,
    });
  });

  it("rejects a duplicate secondary goal", () => {
    expect(parseTasteGoalFormData(formData({
      primaryTasteGoal: "sweet",
      secondaryTasteGoal: "sweet",
    }))).toEqual({
      errors: { secondaryTasteGoal: "Secondary goal must be different from the primary goal." },
      success: false,
      values: { primaryTasteGoal: "sweet", secondaryTasteGoal: "sweet" },
    });
  });
});
