import { getElapsedSeconds } from "./timer";
import type {
  ActiveBrewRecord,
  BrewSessionSyncInput,
  GuidedBrewPlanSnapshot,
  LocalBrewStatus,
  RecordedStepTime,
} from "./types";

export const ACTIVE_BREW_STORAGE_KEY = "dialed.active-brew.v1";

type StorageAdapter = Pick<Storage, "getItem" | "removeItem" | "setItem">;

function closeCurrentStep(record: ActiveBrewRecord, elapsed: number) {
  return record.recordedStepTimes.map((step, index) => (
    index === record.currentStepIndex ? { ...step, actualEndTime: elapsed } : step
  ));
}

export function createActiveBrewRecord(
  plan: GuidedBrewPlanSnapshot,
  sessionId: string,
  now: number,
): ActiveBrewRecord {
  const firstStep = plan.steps[0];
  if (!firstStep) throw new Error("A Guided Brew requires at least one Brew Plan step.");

  return {
    currentStepIndex: 0,
    finishedAt: null,
    plan,
    recordedStepTimes: [{ actualEndTime: null, actualStartTime: 0, brewPlanStepId: firstStep.id }],
    sessionId,
    startedAt: new Date(now).toISOString(),
    status: "active",
    version: 1,
  };
}

export function advanceActiveBrew(record: ActiveBrewRecord, now: number): ActiveBrewRecord {
  if (record.status !== "active") return record;

  const nextStepIndex = record.currentStepIndex + 1;
  const nextStep = record.plan.steps[nextStepIndex];
  if (!nextStep) throw new Error("The final Brew Plan step must be completed, not advanced.");

  const elapsed = getElapsedSeconds(record.startedAt, now);
  return {
    ...record,
    currentStepIndex: nextStepIndex,
    recordedStepTimes: [
      ...closeCurrentStep(record, elapsed),
      { actualEndTime: null, actualStartTime: elapsed, brewPlanStepId: nextStep.id },
    ],
  };
}

function finishActiveBrew(
  record: ActiveBrewRecord,
  now: number,
  status: Extract<LocalBrewStatus, "aborted_pending_sync" | "completed_pending_sync">,
) {
  if (record.status !== "active") return record;

  const finishedAt = new Date(now).toISOString();
  return {
    ...record,
    finishedAt,
    recordedStepTimes: closeCurrentStep(record, getElapsedSeconds(record.startedAt, now)),
    status,
  };
}

export function completeActiveBrew(record: ActiveBrewRecord, now: number) {
  if (record.currentStepIndex !== record.plan.steps.length - 1) {
    throw new Error("A Brew Session cannot complete before the final step.");
  }
  return finishActiveBrew(record, now, "completed_pending_sync");
}

export function abortActiveBrew(record: ActiveBrewRecord, now: number) {
  return finishActiveBrew(record, now, "aborted_pending_sync");
}

export function toBrewSessionSyncInput(record: ActiveBrewRecord): BrewSessionSyncInput {
  const status = record.status === "active"
    ? "brewing"
    : record.status === "completed_pending_sync"
      ? "completed"
      : "aborted";

  return {
    brewPlanId: record.plan.brewPlanId,
    finishedAt: record.finishedAt,
    sessionId: record.sessionId,
    startedAt: record.startedAt,
    status,
    steps: record.recordedStepTimes,
  };
}

function isRecordedStepTime(value: unknown): value is RecordedStepTime {
  if (!value || typeof value !== "object") return false;
  const step = value as Partial<RecordedStepTime>;
  return typeof step.brewPlanStepId === "string"
    && Number.isInteger(step.actualStartTime)
    && (step.actualStartTime ?? -1) >= 0
    && (step.actualEndTime === null || Number.isInteger(step.actualEndTime));
}

function isGuidedBrewPlan(value: unknown): value is GuidedBrewPlanSnapshot {
  if (!value || typeof value !== "object") return false;
  const plan = value as Partial<GuidedBrewPlanSnapshot>;
  return typeof plan.brewPlanId === "string"
    && Number.isFinite(plan.coffeeDose)
    && typeof plan.coffeeName === "string"
    && typeof plan.grindLevel === "string"
    && Number.isFinite(plan.ratio)
    && typeof plan.recipeName === "string"
    && Number.isInteger(plan.targetBrewTimeMax)
    && Number.isInteger(plan.targetBrewTimeMin)
    && typeof plan.tasteGoal === "string"
    && Number.isFinite(plan.waterAmount)
    && Number.isFinite(plan.waterTemperature)
    && Array.isArray(plan.steps)
    && plan.steps.length > 0
    && plan.steps.every((step) => (
      Boolean(step)
      && typeof step === "object"
      && typeof step.id === "string"
      && Number.isInteger(step.stepOrder)
      && Number.isInteger(step.startTime)
      && (step.duration === null || Number.isInteger(step.duration))
      && (step.targetWater === null || Number.isFinite(step.targetWater))
      && (step.note === null || typeof step.note === "string")
      && (step.stepType === "pour" || step.stepType === "wait")
    ));
}

export function parseActiveBrewRecord(serialized: string | null): ActiveBrewRecord | null {
  if (!serialized) return null;

  try {
    const value = JSON.parse(serialized) as Partial<ActiveBrewRecord>;
    if (
      value.version !== 1
      || typeof value.sessionId !== "string"
      || typeof value.startedAt !== "string"
      || (value.finishedAt !== null && typeof value.finishedAt !== "string")
      || !Number.isInteger(value.currentStepIndex)
      || !["active", "completed_pending_sync", "aborted_pending_sync"].includes(value.status ?? "")
      || !isGuidedBrewPlan(value.plan)
      || !Array.isArray(value.recordedStepTimes)
      || !value.recordedStepTimes.every(isRecordedStepTime)
    ) {
      return null;
    }

    const record = value as ActiveBrewRecord;
    if (
      !Number.isFinite(Date.parse(record.startedAt))
      || (record.finishedAt !== null && !Number.isFinite(Date.parse(record.finishedAt)))
      || record.currentStepIndex < 0
      || record.currentStepIndex >= record.plan.steps.length
      || record.recordedStepTimes.length !== record.currentStepIndex + 1
      || record.recordedStepTimes.some((step, index) => (
        step.brewPlanStepId !== record.plan.steps[index]?.id
        || (step.actualEndTime !== null && step.actualEndTime < step.actualStartTime)
      ))
    ) {
      return null;
    }

    return record;
  } catch {
    return null;
  }
}

export function readActiveBrew(storage: StorageAdapter) {
  return parseActiveBrewRecord(storage.getItem(ACTIVE_BREW_STORAGE_KEY));
}

export function saveActiveBrew(storage: StorageAdapter, record: ActiveBrewRecord) {
  storage.setItem(ACTIVE_BREW_STORAGE_KEY, JSON.stringify(record));
}

export function clearActiveBrew(storage: StorageAdapter, sessionId: string) {
  const stored = readActiveBrew(storage);
  if (!stored || stored.sessionId === sessionId) {
    storage.removeItem(ACTIVE_BREW_STORAGE_KEY);
  }
}
