import type { BrewStepType } from "@/domain/recipe/types";
import type { RecommendationSource } from "@/features/brew-plan/types";

import { CANDIDATE_KNOWLEDGE_VERSION } from "./config";
import type { AdjustmentCandidateSnapshot, AdjustmentDecision, AdjustmentDirection } from "./types";

export const ADJUSTMENT_MAGNITUDE_VERSION = "adjustment-magnitude-v1";

export const CANONICAL_GRIND_LEVELS = [
  "fine",
  "medium-fine",
  "medium",
  "medium-coarse",
  "coarse",
] as const;

export type CanonicalGrindLevel = (typeof CANONICAL_GRIND_LEVELS)[number];

export type AdjustmentSourcePlanStep = {
  duration: number | null;
  note: string | null;
  sourceStepId: string;
  startTime: number;
  stepOrder: number;
  stepType: BrewStepType;
  targetWater: number | null;
};

export type AdjustmentSourcePlan = {
  coffeeDose: number;
  coffeeId: string;
  dialInThreadId: string;
  expectedFlavor: string;
  grindLevel: string;
  ratio: number;
  recipeTemplateId: string | null;
  recommendationReason: string;
  sourcePlanId: string;
  steps: AdjustmentSourcePlanStep[];
  targetBrewTimeMax: number;
  targetBrewTimeMin: number;
  waterAmount: number;
  waterTemperature: number;
};

export type ResolvedNextBrewPlan = AdjustmentSourcePlan & {
  magnitudeVersion: typeof ADJUSTMENT_MAGNITUDE_VERSION;
  recommendationSource: Extract<RecommendationSource, "previous_brew_adjustment">;
};

export type AdjustmentResolutionFailure =
  | "decision_not_pending"
  | "grind_boundary"
  | "incompatible_candidate_version"
  | "incompatible_magnitude_version"
  | "invalid_step_rescale"
  | "invalid_water_result"
  | "temperature_boundary"
  | "unsupported_candidate"
  | "unsupported_grind_value";

export type AdjustmentResolution =
  | { nextPlan: ResolvedNextBrewPlan; success: true }
  | { reason: AdjustmentResolutionFailure; success: false };

const PLAN_LIMITS = {
  ratio: { max: 100, min: 1 },
  stepWater: { max: 2000, min: 0.1 },
  temperature: { max: 100, min: 1 },
  water: { max: 2000, min: 1 },
} as const;

const DIRECTION_CANDIDATES = {
  decrease_extraction: ["grind:coarser", "temperature:lower"],
  decrease_strength: ["water:higher"],
  hold: [],
  increase_extraction: ["grind:finer", "temperature:higher"],
  increase_strength: ["water:lower"],
  reduce_astringency: [],
} as const satisfies Record<AdjustmentDirection, readonly string[]>;

function isWithin(value: number, bounds: { max: number; min: number }) {
  return Number.isFinite(value) && value >= bounds.min && value <= bounds.max;
}

function roundDecimal(value: number, decimalPlaces: number) {
  const factor = 10 ** decimalPlaces;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function clonePlan(sourcePlan: AdjustmentSourcePlan): ResolvedNextBrewPlan {
  return {
    ...sourcePlan,
    magnitudeVersion: ADJUSTMENT_MAGNITUDE_VERSION,
    recommendationSource: "previous_brew_adjustment",
    steps: sourcePlan.steps.map((step) => ({ ...step })),
  };
}

function candidateKey(candidate: AdjustmentCandidateSnapshot) {
  return `${candidate.parameter}:${candidate.changeDirection}`;
}

function isCandidateCompatible(direction: AdjustmentDirection, candidate: AdjustmentCandidateSnapshot) {
  return DIRECTION_CANDIDATES[direction].some((key) => key === candidateKey(candidate));
}

function resolveGrind(
  sourcePlan: AdjustmentSourcePlan,
  changeDirection: AdjustmentCandidateSnapshot["changeDirection"],
): AdjustmentResolution {
  const currentIndex = CANONICAL_GRIND_LEVELS.findIndex((level) => level === sourcePlan.grindLevel);
  if (currentIndex === -1) return { reason: "unsupported_grind_value", success: false };

  const offset = changeDirection === "finer" ? -1 : changeDirection === "coarser" ? 1 : 0;
  if (offset === 0) return { reason: "unsupported_candidate", success: false };
  const nextGrindLevel = CANONICAL_GRIND_LEVELS[currentIndex + offset];
  if (!nextGrindLevel) return { reason: "grind_boundary", success: false };

  const nextPlan = clonePlan(sourcePlan);
  nextPlan.grindLevel = nextGrindLevel;
  return { nextPlan, success: true };
}

function resolveTemperature(
  sourcePlan: AdjustmentSourcePlan,
  changeDirection: AdjustmentCandidateSnapshot["changeDirection"],
): AdjustmentResolution {
  const delta = changeDirection === "higher" ? 1 : changeDirection === "lower" ? -1 : 0;
  if (delta === 0) return { reason: "unsupported_candidate", success: false };
  const nextTemperature = sourcePlan.waterTemperature + delta;
  if (!Number.isInteger(nextTemperature) || !isWithin(nextTemperature, PLAN_LIMITS.temperature)) {
    return { reason: "temperature_boundary", success: false };
  }

  const nextPlan = clonePlan(sourcePlan);
  nextPlan.waterTemperature = nextTemperature;
  return { nextPlan, success: true };
}

function rescaleWaterSteps(
  steps: readonly AdjustmentSourcePlanStep[],
  oldWater: number,
  newWater: number,
): { steps: AdjustmentSourcePlanStep[]; success: true } | { success: false } {
  if (!Number.isFinite(oldWater) || oldWater <= 0) return { success: false };

  const pourSteps = steps.filter((step) => step.stepType === "pour");
  if (pourSteps.length === 0) return { success: false };
  if (steps.some((step) => (
    step.stepType === "pour"
      ? step.targetWater === null || !isWithin(step.targetWater, PLAN_LIMITS.stepWater)
      : step.targetWater !== null
  ))) return { success: false };

  for (let index = 1; index < pourSteps.length; index += 1) {
    if ((pourSteps[index]?.targetWater ?? 0) < (pourSteps[index - 1]?.targetWater ?? 0)) {
      return { success: false };
    }
  }

  const finalPourStepId = pourSteps.at(-1)?.sourceStepId;
  const scaleFactor = newWater / oldWater;
  const rescaledSteps = steps.map((step) => {
    if (step.stepType !== "pour" || step.targetWater === null) return { ...step };
    return {
      ...step,
      targetWater: step.sourceStepId === finalPourStepId
        ? newWater
        : roundDecimal(step.targetWater * scaleFactor, 1),
    };
  });
  const rescaledPourSteps = rescaledSteps.filter((step) => step.stepType === "pour");

  if (rescaledPourSteps.some((step) => (
    step.targetWater === null || !isWithin(step.targetWater, PLAN_LIMITS.stepWater)
  ))) return { success: false };
  for (let index = 1; index < rescaledPourSteps.length; index += 1) {
    if ((rescaledPourSteps[index]?.targetWater ?? 0) < (rescaledPourSteps[index - 1]?.targetWater ?? 0)) {
      return { success: false };
    }
  }
  if (rescaledPourSteps.at(-1)?.targetWater !== newWater) return { success: false };

  return { steps: rescaledSteps, success: true };
}

function resolveWater(
  sourcePlan: AdjustmentSourcePlan,
  changeDirection: AdjustmentCandidateSnapshot["changeDirection"],
): AdjustmentResolution {
  const ratioDelta = changeDirection === "higher" ? 1 : changeDirection === "lower" ? -1 : 0;
  if (ratioDelta === 0) return { reason: "unsupported_candidate", success: false };
  if (!Number.isFinite(sourcePlan.coffeeDose) || sourcePlan.coffeeDose <= 0) {
    return { reason: "invalid_water_result", success: false };
  }

  const nextRatio = roundDecimal(sourcePlan.ratio + ratioDelta, 2);
  const nextWater = roundDecimal(sourcePlan.coffeeDose * nextRatio, 2);
  if (!isWithin(nextRatio, PLAN_LIMITS.ratio) || !isWithin(nextWater, PLAN_LIMITS.water)) {
    return { reason: "invalid_water_result", success: false };
  }

  const rescaled = rescaleWaterSteps(sourcePlan.steps, sourcePlan.waterAmount, nextWater);
  if (!rescaled.success) return { reason: "invalid_step_rescale", success: false };

  const nextPlan = clonePlan(sourcePlan);
  nextPlan.ratio = nextRatio;
  nextPlan.steps = rescaled.steps;
  nextPlan.waterAmount = nextWater;
  return { nextPlan, success: true };
}

export function resolveAdjustmentMagnitude(input: {
  decision: AdjustmentDecision;
  magnitudeVersion: string;
  sourcePlan: AdjustmentSourcePlan;
}): AdjustmentResolution {
  if (input.magnitudeVersion !== ADJUSTMENT_MAGNITUDE_VERSION) {
    return { reason: "incompatible_magnitude_version", success: false };
  }
  if (input.decision.status !== "pending") return { reason: "decision_not_pending", success: false };
  if (input.decision.candidateKnowledgeVersion !== CANDIDATE_KNOWLEDGE_VERSION) {
    return { reason: "incompatible_candidate_version", success: false };
  }

  const candidate = input.decision.selectedCandidate;
  if (!candidate || !isCandidateCompatible(input.decision.selectedDirection, candidate)) {
    return { reason: "unsupported_candidate", success: false };
  }

  if (candidate.parameter === "grind") {
    return resolveGrind(input.sourcePlan, candidate.changeDirection);
  }
  if (candidate.parameter === "temperature") {
    return resolveTemperature(input.sourcePlan, candidate.changeDirection);
  }
  if (candidate.parameter === "water") {
    return resolveWater(input.sourcePlan, candidate.changeDirection);
  }
  return { reason: "unsupported_candidate", success: false };
}
