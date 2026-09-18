import { isGuidedBrewPlanSnapshot } from "./presentation";
import type {
  ActiveBrewRecord,
  BrewSessionSyncInput,
  GuidedBrewPlanSnapshot,
  LocalBrewStatus,
} from "./types";

export const ACTIVE_BREW_STORAGE_KEY = "dialed.active-brew.v1";

type StorageAdapter = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export function createActiveBrewRecord(
  plan: GuidedBrewPlanSnapshot,
  sessionId: string,
  now: number,
): ActiveBrewRecord {
  if (!isGuidedBrewPlanSnapshot(plan)) {
    throw new Error("A Guided Brew requires a valid Brew Plan step snapshot.");
  }

  return {
    currentStepIndex: 0,
    finishedAt: null,
    plan,
    sessionId,
    startedAt: new Date(now).toISOString(),
    status: "active",
    version: 2,
  };
}

export function advanceActiveBrew(record: ActiveBrewRecord): ActiveBrewRecord {
  if (record.status !== "active") return record;

  const nextStepIndex = record.currentStepIndex + 1;
  const nextStep = record.plan.steps[nextStepIndex];
  if (!nextStep) throw new Error("The final Brew Plan step must be completed, not advanced.");

  return {
    ...record,
    currentStepIndex: nextStepIndex,
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
  };
}

type LegacyRecordedStepTime = {
  actualEndTime: number | null;
  actualStartTime: number;
  brewPlanStepId: string;
};

function isLegacyRecordedStepTime(value: unknown): value is LegacyRecordedStepTime {
  if (!value || typeof value !== "object") return false;
  const step = value as Partial<LegacyRecordedStepTime>;
  return typeof step.brewPlanStepId === "string"
    && Number.isInteger(step.actualStartTime)
    && (step.actualStartTime ?? -1) >= 0
    && (step.actualEndTime === null || (
      Number.isInteger(step.actualEndTime)
      && (step.actualEndTime ?? -1) >= (step.actualStartTime ?? 0)
    ));
}

export function parseActiveBrewRecord(serialized: string | null): ActiveBrewRecord | null {
  if (!serialized) return null;

  try {
    const value = JSON.parse(serialized) as Partial<Omit<ActiveBrewRecord, "version">> & {
      recordedStepTimes?: unknown;
      version?: unknown;
    };
    if (
      (value.version !== 1 && value.version !== 2)
      || typeof value.sessionId !== "string"
      || typeof value.startedAt !== "string"
      || (value.finishedAt !== null && typeof value.finishedAt !== "string")
      || typeof value.currentStepIndex !== "number"
      || !Number.isInteger(value.currentStepIndex)
      || !["active", "completed_pending_sync", "aborted_pending_sync"].includes(value.status ?? "")
      || !isGuidedBrewPlanSnapshot(value.plan)
    ) {
      return null;
    }

    const plan = value.plan;
    const currentStepIndex = value.currentStepIndex;
    const status = value.status as LocalBrewStatus;
    if (
      !Number.isFinite(Date.parse(value.startedAt))
      || (value.finishedAt !== null && !Number.isFinite(Date.parse(value.finishedAt)))
      || currentStepIndex < 0
      || currentStepIndex >= plan.steps.length
      || (status === "active") !== (value.finishedAt === null)
    ) {
      return null;
    }

    if (value.version === 1) {
      const recordedStepTimes = value.recordedStepTimes;
      if (
        !Array.isArray(recordedStepTimes)
        || recordedStepTimes.length !== currentStepIndex + 1
        || !recordedStepTimes.every(isLegacyRecordedStepTime)
        || recordedStepTimes.some((step, index) => step.brewPlanStepId !== plan.steps[index]?.id)
      ) return null;
    }

    return {
      currentStepIndex,
      finishedAt: value.finishedAt,
      plan,
      sessionId: value.sessionId,
      startedAt: value.startedAt,
      status,
      version: 2,
    };
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
