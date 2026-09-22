import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import { getElapsedSeconds } from "./timer";
import type { BrewSession, BrewSessionStatus, BrewSessionSyncInput } from "./types";

type ExecutionPlanRow = {
  brew_plan_steps: Array<{
    id: string;
    step_order: number;
    step_type: string;
    target_water: number | null;
  }>;
  coffee_dose: number;
  id: string;
  water_amount: number;
  water_temperature: number;
};

type BrewSessionRow = {
  actual_brew_time: number | null;
  actual_coffee_dose: number | null;
  actual_water_amount: number | null;
  actual_water_temperature: number | null;
  brew_plan_id: string;
  finished_at: string | null;
  id: string;
  started_at: string;
  status: string;
};

export class BrewSessionSyncError extends Error {
  readonly reason: "retryable" | "unavailable";

  constructor(message: string, reason: "retryable" | "unavailable" = "retryable", options?: ErrorOptions) {
    super(message, options);
    this.name = "BrewSessionSyncError";
    this.reason = reason;
  }
}

function isBrewSessionStatus(value: string): value is BrewSessionStatus {
  return value === "aborted" || value === "brewing" || value === "completed";
}

function toBrewSession(row: BrewSessionRow): BrewSession {
  if (!isBrewSessionStatus(row.status)) {
    throw new BrewSessionSyncError("Brew Session has an unsupported status.");
  }

  return {
    actualBrewTime: row.actual_brew_time,
    actualCoffeeDose: row.actual_coffee_dose,
    actualWaterAmount: row.actual_water_amount,
    actualWaterTemperature: row.actual_water_temperature,
    brewPlanId: row.brew_plan_id,
    finishedAt: row.finished_at,
    id: row.id,
    startedAt: row.started_at,
    status: row.status,
  };
}

async function getExecutionPlan(
  supabase: SupabaseClient<Database>,
  userId: string,
  brewPlanId: string,
) {
  const { data, error } = await supabase
    .from("brew_plans")
    .select(`
      id,
      coffee_dose,
      water_amount,
      water_temperature,
      brew_plan_steps (
        id,
        step_order,
        step_type,
        target_water
      )
    `)
    .eq("id", brewPlanId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new BrewSessionSyncError("Unable to load the Brew Plan execution snapshot.", "retryable", { cause: error });
  if (!data) throw new BrewSessionSyncError("Brew Plan is unavailable.", "unavailable");
  return data as ExecutionPlanRow;
}

function validateExecutionPlan(plan: ExecutionPlanRow) {
  const planSteps = [...plan.brew_plan_steps].sort((left, right) => left.step_order - right.step_order);
  if (
    planSteps.length === 0
    || planSteps.some((step, index) => (
      !step.id
      || step.step_order !== index + 1
      || (step.step_type === "pour" && (step.target_water === null || step.target_water <= 0))
      || (step.step_type === "wait" && step.target_water !== null)
      || (step.step_type !== "pour" && step.step_type !== "wait")
    ))
  ) throw new BrewSessionSyncError("Brew Plan steps are unavailable or invalid.");
}

async function findBrewSession(
  supabase: SupabaseClient<Database>,
  userId: string,
  sessionId: string,
) {
  const { data, error } = await supabase
    .from("brew_sessions")
    .select("id, brew_plan_id, started_at, finished_at, actual_coffee_dose, actual_water_temperature, actual_water_amount, actual_brew_time, status")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new BrewSessionSyncError("Unable to load the Brew Session.", "retryable", { cause: error });
  return data ? toBrewSession(data as BrewSessionRow) : null;
}

function sameTimestamp(left: string, right: string) {
  return Date.parse(left) === Date.parse(right);
}

export async function syncBrewSession(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: BrewSessionSyncInput,
) {
  const plan = await getExecutionPlan(supabase, userId, input.brewPlanId);
  validateExecutionPlan(plan);
  let session = await findBrewSession(supabase, userId, input.sessionId);

  if (session && (session.brewPlanId !== plan.id || !sameTimestamp(session.startedAt, input.startedAt))) {
    throw new BrewSessionSyncError("Brew Session identity does not match this execution.", "unavailable");
  }

  if (session && session.status !== "brewing") return session;

  if (!session) {
    const { error } = await supabase.rpc("start_brew_session", {
      p_brew_plan_id: plan.id,
      p_session_id: input.sessionId,
      p_started_at: input.startedAt,
    });

    if (error?.code === "42501" || error?.code === "22023") {
      throw new BrewSessionSyncError("Brew Plan or Brew Session is unavailable.", "unavailable", { cause: error });
    }
    if (error) throw new BrewSessionSyncError("Unable to create the Brew Session.", "retryable", { cause: error });
    session = await findBrewSession(supabase, userId, input.sessionId);
    if (!session) throw new BrewSessionSyncError("Brew Session could not be created.");
    if (session.brewPlanId !== plan.id || !sameTimestamp(session.startedAt, input.startedAt)) {
      throw new BrewSessionSyncError("Brew Session identity does not match this execution.", "unavailable");
    }
  }

  if (input.status !== "brewing") {
    if (!input.finishedAt) throw new BrewSessionSyncError("A finished Brew Session requires a finish time.");
    const actualBrewTime = getElapsedSeconds(input.startedAt, Date.parse(input.finishedAt));
    const { data, error } = await supabase
      .from("brew_sessions")
      .update({
        actual_brew_time: actualBrewTime,
        finished_at: input.finishedAt,
        status: input.status,
      })
      .eq("id", input.sessionId)
      .eq("user_id", userId)
      .eq("status", "brewing")
      .select("id, brew_plan_id, started_at, finished_at, actual_coffee_dose, actual_water_temperature, actual_water_amount, actual_brew_time, status")
      .maybeSingle();

    if (error) throw new BrewSessionSyncError("Unable to finish the Brew Session.", "retryable", { cause: error });
    if (data) return toBrewSession(data as BrewSessionRow);

    const completed = await findBrewSession(supabase, userId, input.sessionId);
    if (!completed) throw new BrewSessionSyncError("Finished Brew Session could not be loaded.");
    return completed;
  }

  return session;
}

export async function getBrewSession(
  supabase: SupabaseClient<Database>,
  userId: string,
  sessionId: string,
) {
  return findBrewSession(supabase, userId, sessionId);
}
