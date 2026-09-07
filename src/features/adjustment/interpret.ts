import type { TasteFeedbackSignals } from "@/domain/taste/feedback";

import type { AdjustmentDirection } from "./types";

export const FEEDBACK_INTERPRETATION_VERSION = "feedback-interpretation-v1";

// This is a stable product display/persistence order, not a scientific priority ranking.
export const CANONICAL_ADJUSTMENT_DIRECTION_ORDER = [
  "increase_extraction",
  "decrease_extraction",
  "increase_strength",
  "decrease_strength",
  "reduce_astringency",
  "hold",
] as const satisfies readonly AdjustmentDirection[];

const SIGNAL_TO_DIRECTION = {
  astringent: "reduce_astringency",
  pretty_good: "hold",
  too_bitter: "decrease_extraction",
  too_sour: "increase_extraction",
  too_strong: "decrease_strength",
  too_weak: "increase_strength",
} as const satisfies Record<keyof TasteFeedbackSignals, AdjustmentDirection>;

export function canonicalizeAdjustmentDirections(directions: readonly AdjustmentDirection[]) {
  const present = new Set(directions);
  return CANONICAL_ADJUSTMENT_DIRECTION_ORDER.filter((direction) => present.has(direction));
}

export function interpretTasteFeedback(feedback: TasteFeedbackSignals): AdjustmentDirection[] {
  const inferred = Object.entries(SIGNAL_TO_DIRECTION)
    .filter(([signal]) => feedback[signal as keyof TasteFeedbackSignals])
    .map(([, direction]) => direction);
  return canonicalizeAdjustmentDirections(inferred);
}
