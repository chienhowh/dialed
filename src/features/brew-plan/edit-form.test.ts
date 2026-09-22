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
    { duration: null, id: "step-3", note: "Final", startTime: 40, stepOrder: 3, stepType: "pour", targetWater: 240 },
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
  data.set("step.step-3.startTime", "40");
  data.set("step.step-3.targetWater", "240");
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
          { duration: null, id: "step-3", startTime: 40, targetWater: 240 },
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

  it("rejects ratio/water and final Pour mismatches", () => {
    const ratioMismatch = validFormData();
    ratioMismatch.set("waterAmount", "250");
    const ratioResult = parseBrewPlanEditFormData(ratioMismatch, plan);
    expect(ratioResult.success).toBe(false);
    if (!ratioResult.success) expect(ratioResult.errors.waterAmount).toContain("dose × ratio");

    const finalPourMismatch = validFormData();
    finalPourMismatch.set("step.step-3.targetWater", "239");
    const finalResult = parseBrewPlanEditFormData(finalPourMismatch, plan);
    expect(finalResult.success).toBe(false);
    if (!finalResult.success) expect(finalResult.errors["step.step-3.targetWater"]).toContain("total water");
  });

  it("accepts the documented tenth-gram consistency tolerance", () => {
    const data = validFormData();
    data.set("ratio", "16.67");
    data.set("waterAmount", "250");
    data.set("step.step-3.targetWater", "250");
    expect(parseBrewPlanEditFormData(data, plan).success).toBe(true);
  });

  it("rejects decreasing cumulative targets and invalid timing order", () => {
    const decreasing = validFormData();
    decreasing.set("step.step-1.targetWater", "250");
    const targetResult = parseBrewPlanEditFormData(decreasing, plan);
    expect(targetResult.success).toBe(false);
    if (!targetResult.success) expect(targetResult.errors["step.step-3.targetWater"]).toContain("backward");

    const timing = validFormData();
    timing.set("step.step-3.startTime", "35");
    const timingResult = parseBrewPlanEditFormData(timing, plan);
    expect(timingResult.success).toBe(false);
    if (!timingResult.success) expect(timingResult.errors["step.step-3.startTime"]).toContain("previous timed step");
  });
});
