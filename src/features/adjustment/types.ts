export const ADJUSTMENT_DIRECTIONS = [
  "increase_extraction",
  "decrease_extraction",
  "increase_strength",
  "decrease_strength",
  "reduce_astringency",
  "hold",
] as const;

export type AdjustmentDirection = (typeof ADJUSTMENT_DIRECTIONS)[number];
export type AdjustmentParameter = "grind" | "temperature" | "water";
export type CandidateChangeDirection = "coarser" | "finer" | "higher" | "lower";
export type AdjustmentEvidence = Extract<RecommendationEvidence, "product_heuristic">;

export type AdjustmentCandidateSnapshot = {
  changeDirection: CandidateChangeDirection;
  evidenceClassification: AdjustmentEvidence;
  parameter: AdjustmentParameter;
  reason: string;
};

export type AdjustmentCandidate = AdjustmentCandidateSnapshot & {
  id: string;
  label: string;
};

export type AdjustmentDecisionStatus = "applied" | "held" | "pending" | "unsupported";

export type AdjustmentDecision = {
  appliedBrewPlanId: string | null;
  candidateKnowledgeVersion: string | null;
  createdAt: string;
  id: string;
  inferredDirections: AdjustmentDirection[];
  interpretationVersion: string;
  recommendedCandidate: AdjustmentCandidateSnapshot | null;
  selectedCandidate: AdjustmentCandidateSnapshot | null;
  selectedDirection: AdjustmentDirection;
  status: AdjustmentDecisionStatus;
  tasteFeedbackId: string;
};

export type NewAdjustmentDecision = Omit<AdjustmentDecision, "appliedBrewPlanId" | "createdAt" | "id">;

export function isAdjustmentDirection(value: string): value is AdjustmentDirection {
  return ADJUSTMENT_DIRECTIONS.some((direction) => direction === value);
}
import type { RecommendationEvidence } from "@/features/recommendation/types";
