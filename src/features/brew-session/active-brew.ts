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
  ownerUserId: string,
  now: number,
): ActiveBrewRecord {
  if (!isGuidedBrewPlanSnapshot(plan)) {
    throw new Error("A Guided Brew requires a valid Brew Plan step snapshot.");
  }

  return {
    currentStepIndex: 0,
    finishedAt: null,
    ownerUserId,
    plan,
    sessionId,
    startedAt: new Date(now).toISOString(),
    status: "active",
    version: 3,
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

export function parseActiveBrewRecord(serialized: string | null): ActiveBrewRecord | null {
  if (!serialized) return null;

  try {
    const value = JSON.parse(serialized) as Partial<ActiveBrewRecord>;
    if (
      value.version !== 3
      || typeof value.ownerUserId !== "string"
      || value.ownerUserId.trim().length === 0
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

    return {
      currentStepIndex,
      finishedAt: value.finishedAt,
      ownerUserId: value.ownerUserId,
      plan,
      sessionId: value.sessionId,
      startedAt: value.startedAt,
      status,
      version: 3,
    };
  } catch {
    return null;
  }
}

export function readActiveBrew(storage: StorageAdapter, ownerUserId: string) {
  const record = parseActiveBrewRecord(storage.getItem(ACTIVE_BREW_STORAGE_KEY));
  if (!record || record.ownerUserId !== ownerUserId) {
    storage.removeItem(ACTIVE_BREW_STORAGE_KEY);
    return null;
  }
  return record;
}

export function saveActiveBrew(storage: StorageAdapter, record: ActiveBrewRecord) {
  storage.setItem(ACTIVE_BREW_STORAGE_KEY, JSON.stringify(record));
}

export function clearActiveBrew(storage: StorageAdapter, ownerUserId: string, sessionId: string) {
  const stored = readActiveBrew(storage, ownerUserId);
  if (!stored || stored.sessionId === sessionId) {
    storage.removeItem(ACTIVE_BREW_STORAGE_KEY);
  }
}

export function clearAllActiveBrewRecovery(storage: StorageAdapter) {
  storage.removeItem(ACTIVE_BREW_STORAGE_KEY);
}
