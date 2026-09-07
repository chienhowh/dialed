import { CANDIDATE_KNOWLEDGE_VERSION, getCandidate, getRecommendedCandidate } from "./config";
import { canonicalizeAdjustmentDirections, FEEDBACK_INTERPRETATION_VERSION } from "./interpret";
import type {
  AdjustmentCandidate,
  AdjustmentCandidateSnapshot,
  AdjustmentDirection,
  NewAdjustmentDecision,
} from "./types";

export class InvalidAdjustmentDecisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAdjustmentDecisionError";
  }
}

function snapshot(candidate: AdjustmentCandidate): AdjustmentCandidateSnapshot {
  return {
    changeDirection: candidate.changeDirection,
    evidenceClassification: candidate.evidenceClassification,
    parameter: candidate.parameter,
    reason: candidate.reason,
  };
}

export function buildAdjustmentDecision(input: {
  inferredDirections: readonly AdjustmentDirection[];
  selectedCandidateId?: string;
  selectedDirection: AdjustmentDirection;
  tasteFeedbackId: string;
}): NewAdjustmentDecision {
  const inferredDirections = canonicalizeAdjustmentDirections(input.inferredDirections);
  if (
    inferredDirections.length !== input.inferredDirections.length
    || !inferredDirections.includes(input.selectedDirection)
  ) {
    throw new InvalidAdjustmentDecisionError("Choose one of the inferred adjustment directions.");
  }
  if (inferredDirections.includes("hold") && (inferredDirections.length !== 1 || inferredDirections[0] !== "hold")) {
    throw new InvalidAdjustmentDecisionError("Hold cannot be combined with an adjustment direction.");
  }

  if (input.selectedDirection === "hold") {
    if (inferredDirections.length !== 1 || inferredDirections[0] !== "hold" || input.selectedCandidateId) {
      throw new InvalidAdjustmentDecisionError("Hold must be the only inferred direction and has no candidate.");
    }
    return {
      candidateKnowledgeVersion: null,
      inferredDirections,
      interpretationVersion: FEEDBACK_INTERPRETATION_VERSION,
      recommendedCandidate: null,
      selectedCandidate: null,
      selectedDirection: "hold",
      status: "held",
      tasteFeedbackId: input.tasteFeedbackId,
    };
  }

  const recommendedCandidate = getRecommendedCandidate(input.selectedDirection);
  if (!recommendedCandidate) {
    if (input.selectedCandidateId) {
      throw new InvalidAdjustmentDecisionError("This direction has no reviewed candidate.");
    }
    return {
      candidateKnowledgeVersion: CANDIDATE_KNOWLEDGE_VERSION,
      inferredDirections,
      interpretationVersion: FEEDBACK_INTERPRETATION_VERSION,
      recommendedCandidate: null,
      selectedCandidate: null,
      selectedDirection: input.selectedDirection,
      status: "unsupported",
      tasteFeedbackId: input.tasteFeedbackId,
    };
  }

  const selectedCandidate = input.selectedCandidateId
    ? getCandidate(input.selectedDirection, input.selectedCandidateId)
    : null;
  if (!selectedCandidate) {
    throw new InvalidAdjustmentDecisionError("Choose a reviewed adjustment candidate.");
  }

  return {
    candidateKnowledgeVersion: CANDIDATE_KNOWLEDGE_VERSION,
    inferredDirections,
    interpretationVersion: FEEDBACK_INTERPRETATION_VERSION,
    recommendedCandidate: snapshot(recommendedCandidate),
    selectedCandidate: snapshot(selectedCandidate),
    selectedDirection: input.selectedDirection,
    status: "pending",
    tasteFeedbackId: input.tasteFeedbackId,
  };
}
