import type { AdjustmentCandidate, AdjustmentDirection } from "./types";

export const CANDIDATE_KNOWLEDGE_VERSION = "candidate-catalog-v1";

export const ADJUSTMENT_DIRECTION_PRESENTATION = {
  decrease_extraction: {
    description: "Move away from bitterness with a lower-extraction direction.",
    label: "Reduce extraction",
  },
  decrease_strength: {
    description: "Make the cup feel less strong.",
    label: "Decrease strength",
  },
  hold: {
    description: "Keep this brew unchanged.",
    label: "Keep this brew",
  },
  increase_extraction: {
    description: "Reduce sourness by moving toward higher extraction.",
    label: "Increase extraction",
  },
  increase_strength: {
    description: "Make the cup feel stronger.",
    label: "Increase strength",
  },
  reduce_astringency: {
    description: "Focus the next experiment on reducing astringency.",
    label: "Reduce astringency",
  },
} as const satisfies Record<AdjustmentDirection, { description: string; label: string }>;

const candidate = (
  value: Omit<AdjustmentCandidate, "evidenceClassification" | "id">,
): AdjustmentCandidate => ({
  ...value,
  evidenceClassification: "product_heuristic",
  id: `${value.parameter}:${value.changeDirection}`,
});

const CANDIDATE_CATALOG = {
  decrease_extraction: [
    candidate({
      changeDirection: "coarser",
      label: "Grind coarser",
      parameter: "grind",
      reason: "A coarser grind is the reviewed first adjustment for moving toward lower extraction.",
    }),
    candidate({
      changeDirection: "lower",
      label: "Lower water temperature",
      parameter: "temperature",
      reason: "Lower water temperature is a reviewed alternative for moving toward lower extraction.",
    }),
  ],
  decrease_strength: [
    candidate({
      changeDirection: "higher",
      label: "Use more water",
      parameter: "water",
      reason: "With coffee dose fixed, more water is the reviewed adjustment for decreasing strength.",
    }),
  ],
  hold: [],
  increase_extraction: [
    candidate({
      changeDirection: "finer",
      label: "Grind finer",
      parameter: "grind",
      reason: "A finer grind is the reviewed first adjustment for moving toward higher extraction.",
    }),
    candidate({
      changeDirection: "higher",
      label: "Increase water temperature",
      parameter: "temperature",
      reason: "Higher water temperature is a reviewed alternative for moving toward higher extraction.",
    }),
  ],
  increase_strength: [
    candidate({
      changeDirection: "lower",
      label: "Use less water",
      parameter: "water",
      reason: "With coffee dose fixed, less water is the reviewed adjustment for increasing strength.",
    }),
  ],
  reduce_astringency: [],
} as const satisfies Record<AdjustmentDirection, readonly AdjustmentCandidate[]>;

export function getCandidatesForDirection(direction: AdjustmentDirection): readonly AdjustmentCandidate[] {
  return CANDIDATE_CATALOG[direction];
}

export function getRecommendedCandidate(direction: AdjustmentDirection) {
  return getCandidatesForDirection(direction)[0] ?? null;
}

export function shouldPersistDecisionWithFeedback(direction: AdjustmentDirection) {
  return direction === "hold" || getRecommendedCandidate(direction) === null;
}

export function getCandidate(direction: AdjustmentDirection, candidateId: string) {
  return getCandidatesForDirection(direction).find(({ id }) => id === candidateId) ?? null;
}

export function getCandidateSnapshotLabel(candidate: Pick<AdjustmentCandidate, "changeDirection" | "parameter">) {
  return getCandidatesForDirection("increase_extraction")
    .concat(
      getCandidatesForDirection("decrease_extraction"),
      getCandidatesForDirection("increase_strength"),
      getCandidatesForDirection("decrease_strength"),
    )
    .find(({ changeDirection, parameter }) => (
      changeDirection === candidate.changeDirection && parameter === candidate.parameter
    ))?.label ?? "Saved adjustment";
}
