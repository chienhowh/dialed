import { describe, expect, it } from "vitest";

import {
  CANDIDATE_KNOWLEDGE_VERSION,
  getCandidatesForDirection,
  getRecommendedCandidate,
} from "./config";
import type { AdjustmentDirection } from "./types";

describe("Candidate Catalog v1", () => {
  it("contains the reviewed extraction candidates in recommendation order", () => {
    expect(getCandidatesForDirection("increase_extraction")).toMatchObject([
      { changeDirection: "finer", parameter: "grind" },
      { changeDirection: "higher", parameter: "temperature" },
    ]);
    expect(getCandidatesForDirection("decrease_extraction")).toMatchObject([
      { changeDirection: "coarser", parameter: "grind" },
      { changeDirection: "lower", parameter: "temperature" },
    ]);
  });

  it("uses fixed-dose water changes for strength", () => {
    expect(getCandidatesForDirection("increase_strength")).toMatchObject([
      { changeDirection: "lower", parameter: "water" },
    ]);
    expect(getCandidatesForDirection("decrease_strength")).toMatchObject([
      { changeDirection: "higher", parameter: "water" },
    ]);
  });

  it("has no candidate for reduce astringency or hold", () => {
    expect(getCandidatesForDirection("reduce_astringency")).toEqual([]);
    expect(getCandidatesForDirection("hold")).toEqual([]);
  });

  it("uses the first reviewed candidate as the recommendation", () => {
    expect(getRecommendedCandidate("increase_extraction")).toMatchObject({
      changeDirection: "finer",
      parameter: "grind",
    });
  });

  it("uses only product heuristic evidence and contains no resolved values", () => {
    const directions: AdjustmentDirection[] = [
      "increase_extraction",
      "decrease_extraction",
      "increase_strength",
      "decrease_strength",
    ];
    const candidates = directions.flatMap((direction) => [...getCandidatesForDirection(direction)]);
    expect(candidates.every(({ evidenceClassification }) => evidenceClassification === "product_heuristic")).toBe(true);
    for (const candidate of candidates) {
      expect(candidate).not.toHaveProperty("previousValue");
      expect(candidate).not.toHaveProperty("suggestedValue");
      expect(candidate).not.toHaveProperty("magnitude");
    }
  });

  it("uses an explicit candidate knowledge version", () => {
    expect(CANDIDATE_KNOWLEDGE_VERSION).toBe("candidate-catalog-v1");
  });
});
