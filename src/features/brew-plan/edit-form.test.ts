import { describe, expect, it } from "vitest";

import type { BrewPlan } from "./types";
import { parseBrewPlanEditFormData } from "./edit-form";

const plan = {
  coffeeDose: 15,
  grindLevel: "medium-fine",
  ratio: 16,
  steps: [
    { duration: null, id: "step-1", note: "Bloom", startTime: 0, stepOrder: 1, stepType: "pour", targetWater: 40 },
    { duration: 30, id: "step-2", note: "Wait", startTime: 10, stepOrder: 2, stepType: "wait", targetWater: null },
  ],
  targetBrewTimeMax: 160,
  targetBrewTimeMin: 135,
  waterAmount: 240,
  waterTemperature: 92,
} as BrewPlan;

function validFormData() {
  const data = new FormData();
  data.set("coffeeDose", "15");
  data.set("waterAmount", "240");
  data.set("ratio", "16");
  data.set("waterTemperature", "92");
  data.set("grindLevel", "medium-fine");
  data.set("targetBrewTimeMin", "135");
  data.set("targetBrewTimeMax", "160");
  data.set("step.step-1.startTime", "0");
  data.set("step.step-1.targetWater", "40");
  data.set("step.step-2.startTime", "10");
  data.set("step.step-2.duration", "30");
  return data;
}

describe("parseBrewPlanEditFormData", () => {
  it("parses documented plan parameters and snapshot steps", () => {
    expect(parseBrewPlanEditFormData(validFormData(), plan)).toEqual({
      data: {
        coffeeDose: 15,
        grindLevel: "medium-fine",
        ratio: 16,
        steps: [
          { duration: null, id: "step-1", startTime: 0, targetWater: 40 },
          { duration: 30, id: "step-2", startTime: 10, targetWater: null },
        ],
        targetBrewTimeMax: 160,
        targetBrewTimeMin: 135,
        waterAmount: 240,
        waterTemperature: 92,
      },
      success: true,
    });
  });

  it("requires pour targets and an ordered target time range", () => {
    const data = validFormData();
    data.set("step.step-1.targetWater", "");
    data.set("targetBrewTimeMin", "200");
    data.set("targetBrewTimeMax", "100");

    const result = parseBrewPlanEditFormData(data, plan);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors["step.step-1.targetWater"]).toBe("Pour steps require a target water amount.");
      expect(result.errors.targetBrewTimeMax).toBe("Latest finish must be at or after earliest finish.");
    }
  });

  it("rejects non-canonical numeric input", () => {
    const data = validFormData();
    data.set("waterTemperature", "92.5");
    expect(parseBrewPlanEditFormData(data, plan).success).toBe(false);
  });
});
