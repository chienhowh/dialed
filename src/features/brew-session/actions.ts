"use server";

import { requireUser } from "@/features/auth/require-user";

import { syncBrewSession } from "./repository";
import type { BrewSessionStatus, BrewSessionSyncInput, BrewSessionSyncResult } from "./types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isTimestamp(value: string) {
  return Number.isFinite(Date.parse(value));
}

function isStatus(value: string): value is BrewSessionStatus {
  return value === "aborted" || value === "brewing" || value === "completed";
}

function isValidInput(input: BrewSessionSyncInput) {
  if (
    !UUID_PATTERN.test(input.sessionId)
    || !UUID_PATTERN.test(input.brewPlanId)
    || !isTimestamp(input.startedAt)
    || !isStatus(input.status)
    || (input.finishedAt !== null && !isTimestamp(input.finishedAt))
    || (input.status === "brewing" && input.finishedAt !== null)
    || (input.status !== "brewing" && input.finishedAt === null)
    || (input.finishedAt !== null && Date.parse(input.finishedAt) < Date.parse(input.startedAt))
    || !Array.isArray(input.steps)
  ) {
    return false;
  }

  return input.steps.every((step) => (
    UUID_PATTERN.test(step.brewPlanStepId)
    && Number.isInteger(step.actualStartTime)
    && step.actualStartTime >= 0
    && (step.actualEndTime === null || (
      Number.isInteger(step.actualEndTime)
      && step.actualEndTime >= step.actualStartTime
    ))
  ));
}

export async function syncBrewSessionAction(input: BrewSessionSyncInput): Promise<BrewSessionSyncResult> {
  if (!isValidInput(input)) return { message: "Brew Session data is invalid.", success: false };

  try {
    const { supabase, user } = await requireUser();
    const session = await syncBrewSession(supabase, user.id, input);
    return { sessionId: session.id, status: session.status, success: true };
  } catch {
    return { message: "This brew is saved on this device and will sync when the connection returns.", success: false };
  }
}
