import "server-only";

import type { Json } from "@/types/database";
import { requireUser } from "@/features/auth/require-user";

import {
  ADJUSTMENT_MAGNITUDE_VERSION,
  type AdjustmentResolutionFailure,
  type AdjustmentSourcePlan,
  resolveAdjustmentMagnitude,
} from "./magnitude";
import {
  AdjustmentPersistenceError,
  getAdjustmentApplicationSource,
  getAdjustmentDecision,
  persistAppliedAdjustment,
} from "./repository";

export type ApplyAdjustmentDecisionResult =
  | { brewPlanId: string; status: "applied" }
  | { reason: AdjustmentResolutionFailure; status: "not_applied" };

export class AdjustmentDecisionNotFoundError extends Error {
  constructor() {
    super("Adjustment Decision is unavailable.");
    this.name = "AdjustmentDecisionNotFoundError";
  }
}

function toSourcePlan(source: Awaited<ReturnType<typeof getAdjustmentApplicationSource>>["plan"]): AdjustmentSourcePlan {
  return {
    coffeeDose: source.coffeeDose,
    coffeeId: source.coffee.id,
    dialInThreadId: source.dialInThreadId,
    expectedFlavor: source.expectedFlavor,
    grindLevel: source.grindLevel,
    ratio: source.ratio,
    recipeTemplateId: source.recipeTemplateId,
    recommendationReason: source.recommendationReason,
    sourcePlanId: source.id,
    steps: source.steps.map((step) => ({
      duration: step.duration,
      note: step.note,
      sourceStepId: step.id,
      startTime: step.startTime,
      stepOrder: step.stepOrder,
      stepType: step.stepType,
      targetWater: step.targetWater,
    })),
    targetBrewTimeMax: source.targetBrewTimeMax,
    targetBrewTimeMin: source.targetBrewTimeMin,
    waterAmount: source.waterAmount,
    waterTemperature: source.waterTemperature,
  };
}

export async function applyAdjustmentDecision(decisionId: string): Promise<ApplyAdjustmentDecisionResult> {
  const { supabase, user } = await requireUser();
  const decision = await getAdjustmentDecision(supabase, user.id, decisionId);
  if (!decision) throw new AdjustmentDecisionNotFoundError();

  if (decision.status === "applied") {
    if (!decision.appliedBrewPlanId) {
      throw new AdjustmentPersistenceError("Applied Adjustment Decision has no generated Brew Plan.");
    }
    return { brewPlanId: decision.appliedBrewPlanId, status: "applied" };
  }
  if (decision.status !== "pending") {
    return { reason: "decision_not_pending", status: "not_applied" };
  }

  const { plan } = await getAdjustmentApplicationSource(supabase, user.id, decision);
  const resolution = resolveAdjustmentMagnitude({
    decision,
    magnitudeVersion: ADJUSTMENT_MAGNITUDE_VERSION,
    sourcePlan: toSourcePlan(plan),
  });
  if (!resolution.success) return { reason: resolution.reason, status: "not_applied" };

  const { nextPlan } = resolution;
  const parameter = decision.selectedCandidate?.parameter;
  const pourTargets = parameter === "water"
    ? Object.fromEntries(nextPlan.steps
      .filter((step) => step.stepType === "pour")
      .map((step) => [step.sourceStepId, step.targetWater])) as Json
    : {};
  const brewPlanId = await persistAppliedAdjustment(supabase, {
    decisionId: decision.id,
    grindLevel: nextPlan.grindLevel,
    magnitudeVersion: nextPlan.magnitudeVersion,
    pourTargets,
    ratio: nextPlan.ratio,
    waterAmount: nextPlan.waterAmount,
    waterTemperature: nextPlan.waterTemperature,
  });

  return { brewPlanId, status: "applied" };
}
