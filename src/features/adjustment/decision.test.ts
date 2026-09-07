import { describe, expect, it } from "vitest";

import { buildAdjustmentDecision, InvalidAdjustmentDecisionError } from "./decision";

const feedbackId = "00000000-0000-4000-8000-000000000001";

describe("buildAdjustmentDecision", () => {
  it("builds the approved held shape", () => {
    expect(buildAdjustmentDecision({
      inferredDirections: ["hold"],
      selectedDirection: "hold",
      tasteFeedbackId: feedbackId,
    })).toMatchObject({
      candidateKnowledgeVersion: null,
      inferredDirections: ["hold"],
      interpretationVersion: "feedback-interpretation-v1",
      recommendedCandidate: null,
      selectedCandidate: null,
      selectedDirection: "hold",
      status: "held",
    });
  });

  it("persists recommended and selected snapshots when they match", () => {
    const decision = buildAdjustmentDecision({
      inferredDirections: ["increase_extraction"],
      selectedCandidateId: "grind:finer",
      selectedDirection: "increase_extraction",
      tasteFeedbackId: feedbackId,
    });
    expect(decision.status).toBe("pending");
    expect(decision.recommendedCandidate).toEqual(decision.selectedCandidate);
    expect(decision.candidateKnowledgeVersion).toBe("candidate-catalog-v1");
  });

  it("preserves a recommended candidate separately from the selected alternative", () => {
    const decision = buildAdjustmentDecision({
      inferredDirections: ["increase_extraction"],
      selectedCandidateId: "temperature:higher",
      selectedDirection: "increase_extraction",
      tasteFeedbackId: feedbackId,
    });
    expect(decision.recommendedCandidate).toMatchObject({ parameter: "grind" });
    expect(decision.selectedCandidate).toMatchObject({ parameter: "temperature" });
  });

  it("builds the approved unsupported shape", () => {
    expect(buildAdjustmentDecision({
      inferredDirections: ["reduce_astringency"],
      selectedDirection: "reduce_astringency",
      tasteFeedbackId: feedbackId,
    })).toMatchObject({
      candidateKnowledgeVersion: "candidate-catalog-v1",
      recommendedCandidate: null,
      selectedCandidate: null,
      status: "unsupported",
    });
  });

  it("rejects a candidate outside the selected direction catalog", () => {
    expect(() => buildAdjustmentDecision({
      inferredDirections: ["increase_strength"],
      selectedCandidateId: "grind:finer",
      selectedDirection: "increase_strength",
      tasteFeedbackId: feedbackId,
    })).toThrow(InvalidAdjustmentDecisionError);
  });

  it("rejects a direction that was not inferred", () => {
    expect(() => buildAdjustmentDecision({
      inferredDirections: ["increase_extraction", "increase_strength"],
      selectedCandidateId: "water:lower",
      selectedDirection: "decrease_strength",
      tasteFeedbackId: feedbackId,
    })).toThrow(InvalidAdjustmentDecisionError);
  });

  it("rejects hold combined with an actionable direction", () => {
    expect(() => buildAdjustmentDecision({
      inferredDirections: ["hold", "increase_extraction"],
      selectedCandidateId: "grind:finer",
      selectedDirection: "increase_extraction",
      tasteFeedbackId: feedbackId,
    })).toThrow(InvalidAdjustmentDecisionError);
  });
});
