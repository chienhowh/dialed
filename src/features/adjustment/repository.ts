import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/types/database";
import { getBrewPlan } from "@/features/brew-plan/repository";
import { getBrewSession } from "@/features/brew-session/repository";

import type {
  AdjustmentCandidateSnapshot,
  AdjustmentDecision,
  AdjustmentDecisionStatus,
  AdjustmentDirection,
  NewAdjustmentDecision,
} from "./types";
import { isAdjustmentDirection } from "./types";

type AdjustmentDecisionRow = Database["public"]["Tables"]["adjustment_decisions"]["Row"];

export class AdjustmentPersistenceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AdjustmentPersistenceError";
  }
}

function isDecisionStatus(value: string): value is AdjustmentDecisionStatus {
  return value === "applied" || value === "held" || value === "pending" || value === "unsupported";
}

function isCandidateSnapshot(value: Json | null): value is AdjustmentCandidateSnapshot {
  if (!value || Array.isArray(value) || typeof value !== "object") return false;
  const candidate = value as Record<string, Json | undefined>;
  const parameter = candidate.parameter;
  const direction = candidate.changeDirection;
  return Object.keys(candidate).length === 4
    && (parameter === "grind" || parameter === "temperature" || parameter === "water")
    && (direction === "coarser" || direction === "finer" || direction === "higher" || direction === "lower")
    && candidate.evidenceClassification === "product_heuristic"
    && typeof candidate.reason === "string"
    && candidate.reason.trim().length > 0;
}

function parseDirections(values: string[]): AdjustmentDirection[] {
  if (values.length === 0 || values.some((value) => !isAdjustmentDirection(value))) {
    throw new AdjustmentPersistenceError("Adjustment Decision contains invalid inferred directions.");
  }
  return values as AdjustmentDirection[];
}

function toAdjustmentDecision(row: AdjustmentDecisionRow): AdjustmentDecision {
  if (!isAdjustmentDirection(row.selected_direction) || !isDecisionStatus(row.status)) {
    throw new AdjustmentPersistenceError("Adjustment Decision contains unsupported values.");
  }
  if (row.recommended_candidate !== null && !isCandidateSnapshot(row.recommended_candidate)) {
    throw new AdjustmentPersistenceError("Adjustment Decision contains an invalid recommended candidate.");
  }
  if (row.selected_candidate !== null && !isCandidateSnapshot(row.selected_candidate)) {
    throw new AdjustmentPersistenceError("Adjustment Decision contains an invalid selected candidate.");
  }
  if ((row.status === "applied") !== (row.applied_brew_plan_id !== null)) {
    throw new AdjustmentPersistenceError("Adjustment Decision has an inconsistent applied Plan relationship.");
  }

  return {
    appliedBrewPlanId: row.applied_brew_plan_id,
    candidateKnowledgeVersion: row.candidate_knowledge_version,
    createdAt: row.created_at,
    id: row.id,
    inferredDirections: parseDirections(row.inferred_directions),
    interpretationVersion: row.interpretation_version,
    recommendedCandidate: row.recommended_candidate,
    selectedCandidate: row.selected_candidate,
    selectedDirection: row.selected_direction,
    status: row.status,
    tasteFeedbackId: row.taste_feedback_id,
  };
}

export async function getAdjustmentApplicationSource(
  supabase: SupabaseClient<Database>,
  userId: string,
  decision: AdjustmentDecision,
) {
  const { data: feedback, error: feedbackError } = await supabase
    .from("taste_feedback")
    .select("brew_session_id")
    .eq("id", decision.tasteFeedbackId)
    .eq("user_id", userId)
    .maybeSingle();
  if (feedbackError) {
    throw new AdjustmentPersistenceError("Unable to load Adjustment Decision source Feedback.", {
      cause: feedbackError,
    });
  }
  if (!feedback) throw new AdjustmentPersistenceError("Adjustment Decision source Feedback is unavailable.");

  const session = await getBrewSession(supabase, userId, feedback.brew_session_id);
  if (!session || session.status !== "completed") {
    throw new AdjustmentPersistenceError("Adjustment Decision source Session is unavailable or incomplete.");
  }

  const plan = await getBrewPlan(supabase, userId, session.brewPlanId);
  if (!plan) throw new AdjustmentPersistenceError("Adjustment Decision source Plan is unavailable.");

  return { plan, sessionId: session.id };
}

export async function persistAppliedAdjustment(
  supabase: SupabaseClient<Database>,
  input: {
    decisionId: string;
    grindLevel: string;
    magnitudeVersion: string;
    pourTargets: Json;
    ratio: number;
    waterAmount: number;
    waterTemperature: number;
  },
) {
  const { data, error } = await supabase.rpc("apply_adjustment_decision", {
    p_adjustment_decision_id: input.decisionId,
    p_grind_level: input.grindLevel,
    p_magnitude_version: input.magnitudeVersion,
    p_pour_targets: input.pourTargets,
    p_ratio: input.ratio,
    p_water_amount: input.waterAmount,
    p_water_temperature: input.waterTemperature,
  });

  if (error) throw new AdjustmentPersistenceError("Unable to apply Adjustment Decision.", { cause: error });
  if (!data) throw new AdjustmentPersistenceError("Applied Adjustment Decision did not return a Brew Plan.");
  return data;
}

export async function getAdjustmentDecision(
  supabase: SupabaseClient<Database>,
  userId: string,
  adjustmentDecisionId: string,
) {
  const { data, error } = await supabase
    .from("adjustment_decisions")
    .select("*")
    .eq("id", adjustmentDecisionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new AdjustmentPersistenceError("Unable to load Adjustment Decision.", { cause: error });
  return data ? toAdjustmentDecision(data) : null;
}

export async function getAdjustmentDecisionByFeedback(
  supabase: SupabaseClient<Database>,
  userId: string,
  tasteFeedbackId: string,
) {
  const { data, error } = await supabase
    .from("adjustment_decisions")
    .select("*")
    .eq("taste_feedback_id", tasteFeedbackId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new AdjustmentPersistenceError("Unable to load Adjustment Decision.", { cause: error });
  return data ? toAdjustmentDecision(data) : null;
}

export async function createAdjustmentDecision(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: NewAdjustmentDecision,
) {
  const { error } = await supabase.from("adjustment_decisions").upsert({
    candidate_knowledge_version: input.candidateKnowledgeVersion,
    inferred_directions: input.inferredDirections,
    interpretation_version: input.interpretationVersion,
    recommended_candidate: input.recommendedCandidate as Json | null,
    selected_candidate: input.selectedCandidate as Json | null,
    selected_direction: input.selectedDirection,
    status: input.status,
    taste_feedback_id: input.tasteFeedbackId,
    user_id: userId,
  }, { ignoreDuplicates: true, onConflict: "taste_feedback_id" });

  if (error) throw new AdjustmentPersistenceError("Unable to save Adjustment Decision.", { cause: error });
  const decision = await getAdjustmentDecisionByFeedback(supabase, userId, input.tasteFeedbackId);
  if (!decision) throw new AdjustmentPersistenceError("Saved Adjustment Decision could not be loaded.");
  return decision;
}
