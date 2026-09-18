import { describe, expect, it } from "vitest";

import {
  ACTIVE_BREW_STORAGE_KEY,
  advanceActiveBrew,
  clearActiveBrew,
  completeActiveBrew,
  createActiveBrewRecord,
  parseActiveBrewRecord,
  readActiveBrew,
  saveActiveBrew,
  toBrewSessionSyncInput,
} from "./active-brew";
import type { GuidedBrewPlanSnapshot } from "./types";

const plan: GuidedBrewPlanSnapshot = {
  brewPlanId: "c4000000-0000-4000-8000-000000000001",
  coffeeDose: 15,
  coffeeName: "Snapshot Coffee",
  grindLevel: "medium-fine",
  ratio: 16,
  recipeName: "Pour Wait Pour",
  steps: [
    { duration: null, id: "c5000000-0000-4000-8000-000000000001", note: "Bloom", startTime: 0, stepOrder: 1, stepType: "pour", targetWater: 40 },
    { duration: 30, id: "c5000000-0000-4000-8000-000000000002", note: "Wait", startTime: 10, stepOrder: 2, stepType: "wait", targetWater: null },
    { duration: null, id: "c5000000-0000-4000-8000-000000000003", note: "Final pour", startTime: 40, stepOrder: 3, stepType: "pour", targetWater: 240 },
  ],
  targetBrewTimeMax: 160,
  targetBrewTimeMin: 135,
  tasteGoal: "Sweet + Clean",
  waterAmount: 240,
  waterTemperature: 92,
};

const sessionId = "c6000000-0000-4000-8000-000000000001";
const startedAt = Date.parse("2026-09-02T01:00:00.000Z");

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
    values,
  };
}

describe("active Brew Session state", () => {
  it("moves through persisted steps without creating actual step telemetry", () => {
    const started = createActiveBrewRecord(plan, sessionId, startedAt);
    const waiting = advanceActiveBrew(started);
    const pouring = advanceActiveBrew(waiting);
    const completed = completeActiveBrew(pouring, startedAt + 150_800);

    expect(completed.currentStepIndex).toBe(2);
    expect(completed.status).toBe("completed_pending_sync");
    const syncInput = toBrewSessionSyncInput(completed);
    expect(syncInput).toMatchObject({
      brewPlanId: plan.brewPlanId,
      sessionId,
      status: "completed",
    });
    expect("steps" in syncInput).toBe(false);
  });

  it("restores the same stable session and timestamp after a refresh", () => {
    const storage = memoryStorage();
    const active = advanceActiveBrew(createActiveBrewRecord(plan, sessionId, startedAt));
    saveActiveBrew(storage, active);

    const restored = readActiveBrew(storage);
    expect(restored).toEqual(active);
    expect(restored?.sessionId).toBe(sessionId);
    expect(restored?.startedAt).toBe("2026-09-02T01:00:00.000Z");
    expect(storage.values.size).toBe(1);
    expect(storage.values.has(ACTIVE_BREW_STORAGE_KEY)).toBe(true);
  });

  it("keeps completion idempotent and clears only the matching local execution", () => {
    const storage = memoryStorage();
    const finalStep = advanceActiveBrew(
      advanceActiveBrew(createActiveBrewRecord(plan, sessionId, startedAt)),
    );
    const completed = completeActiveBrew(finalStep, startedAt + 150_000);
    saveActiveBrew(storage, completed);

    expect(completeActiveBrew(completed, startedAt + 170_000)).toBe(completed);
    clearActiveBrew(storage, "c6000000-0000-4000-8000-000000000099");
    expect(readActiveBrew(storage)).toEqual(completed);
    clearActiveBrew(storage, sessionId);
    expect(readActiveBrew(storage)).toBeNull();
  });

  it("rejects inconsistent local records instead of resuming corrupt state", () => {
    const active = createActiveBrewRecord(plan, sessionId, startedAt);
    expect(parseActiveBrewRecord(JSON.stringify({ ...active, currentStepIndex: 3 }))).toBeNull();
  });

  it("recovers a legacy v1 record while discarding unmeasured step values", () => {
    const active = createActiveBrewRecord(plan, sessionId, startedAt);
    const legacy = {
      ...active,
      recordedStepTimes: [{ actualEndTime: null, actualStartTime: 0, brewPlanStepId: plan.steps[0].id }],
      version: 1,
    };

    expect(parseActiveBrewRecord(JSON.stringify(legacy))).toEqual(active);
  });
});
