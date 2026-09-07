import { describe, expect, it } from "vitest";

import type { TasteFeedbackSignals } from "@/domain/taste/feedback";

import {
  CANONICAL_ADJUSTMENT_DIRECTION_ORDER,
  canonicalizeAdjustmentDirections,
  FEEDBACK_INTERPRETATION_VERSION,
  interpretTasteFeedback,
} from "./interpret";

function signals(overrides: Partial<TasteFeedbackSignals>): TasteFeedbackSignals {
  return {
    astringent: false,
    pretty_good: false,
    too_bitter: false,
    too_sour: false,
    too_strong: false,
    too_weak: false,
    ...overrides,
  };
}

describe("interpretTasteFeedback", () => {
  it.each([
    [{ pretty_good: true }, ["hold"]],
    [{ too_sour: true }, ["increase_extraction"]],
    [{ too_bitter: true }, ["decrease_extraction"]],
    [{ too_weak: true }, ["increase_strength"]],
    [{ too_strong: true }, ["decrease_strength"]],
    [{ astringent: true }, ["reduce_astringency"]],
  ] as const)("maps %o conservatively", (input, expected) => {
    expect(interpretTasteFeedback(signals(input))).toEqual(expected);
  });

  it("returns multiple directions in stable product order without choosing a priority", () => {
    expect(interpretTasteFeedback(signals({ astringent: true, too_sour: true, too_weak: true }))).toEqual([
      "increase_extraction",
      "increase_strength",
      "reduce_astringency",
    ]);
  });

  it("canonicalizes and deduplicates directions deterministically", () => {
    expect(canonicalizeAdjustmentDirections([
      "reduce_astringency",
      "increase_strength",
      "increase_strength",
      "increase_extraction",
    ])).toEqual(["increase_extraction", "increase_strength", "reduce_astringency"]);
    expect(CANONICAL_ADJUSTMENT_DIRECTION_ORDER).toEqual([
      "increase_extraction",
      "decrease_extraction",
      "increase_strength",
      "decrease_strength",
      "reduce_astringency",
      "hold",
    ]);
  });

  it("uses an explicit interpretation version", () => {
    expect(FEEDBACK_INTERPRETATION_VERSION).toBe("feedback-interpretation-v1");
  });
});
