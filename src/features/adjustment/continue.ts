import type { AdjustmentResolutionFailure } from "./magnitude";
import type { AdjustmentDecision } from "./types";

export type ContinueDialInState = {
  message: string | null;
  retryable: boolean;
};

export const initialContinueDialInState: ContinueDialInState = {
  message: null,
  retryable: true,
};

export type AdjustmentResultPresentation =
  | { action: "continue"; candidateLabel: string; title: "Adjustment saved" }
  | { action: "done"; title: "Dialed in" | "Direction saved" }
  | { action: "view_plan"; brewPlanId: string; title: "Next brew ready" };

export function getAdjustmentResultPresentation(
  decision: AdjustmentDecision,
  candidateLabel: string,
): AdjustmentResultPresentation {
  if (decision.status === "applied" && decision.appliedBrewPlanId) {
    return {
      action: "view_plan",
      brewPlanId: decision.appliedBrewPlanId,
      title: "Next brew ready",
    };
  }
  if (decision.status === "pending" && decision.selectedCandidate) {
    return { action: "continue", candidateLabel, title: "Adjustment saved" };
  }
  if (decision.status === "held") return { action: "done", title: "Dialed in" };
  return { action: "done", title: "Direction saved" };
}

export function getAdjustmentFailureState(reason: AdjustmentResolutionFailure): ContinueDialInState {
  switch (reason) {
    case "unsupported_grind_value":
      return { message: "Current grind cannot be adjusted automatically.", retryable: false };
    case "grind_boundary":
    case "temperature_boundary":
      return { message: "This adjustment is already at Dialed’s supported limit.", retryable: false };
    case "invalid_water_result":
    case "invalid_step_rescale":
      return { message: "This brew cannot be adjusted automatically with its current values.", retryable: false };
    case "incompatible_candidate_version":
    case "incompatible_magnitude_version":
    case "unsupported_candidate":
      return { message: "This saved adjustment cannot be applied automatically.", retryable: false };
    case "decision_not_pending":
      return { message: "This adjustment is no longer pending. Refresh to see its current state.", retryable: false };
  }
}

export function getUnexpectedApplyFailureState(): ContinueDialInState {
  return { message: "We could not prepare the next brew. Please try again.", retryable: true };
}
