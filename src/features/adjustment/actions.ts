"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect, unstable_rethrow } from "next/navigation";

import { requireUser } from "@/features/auth/require-user";
import { getFeedbackFlowContext, getTasteFeedbackBySession } from "@/features/feedback/repository";

import { buildAdjustmentDecision, InvalidAdjustmentDecisionError } from "./decision";
import { AdjustmentDecisionNotFoundError, applyAdjustmentDecision } from "./apply";
import {
  getAdjustmentFailureState,
  getUnexpectedApplyFailureState,
  type ContinueDialInState,
} from "./continue";
import type { AdjustmentFormState } from "./form";
import { interpretTasteFeedback } from "./interpret";
import { createAdjustmentDecision, getAdjustmentDecisionByFeedback } from "./repository";
import { isAdjustmentDirection } from "./types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function continueDialInAction(
  decisionId: string,
  previousState: ContinueDialInState,
  formData: FormData,
): Promise<ContinueDialInState> {
  void previousState;
  void formData;
  if (!UUID_PATTERN.test(decisionId)) notFound();

  let result: Awaited<ReturnType<typeof applyAdjustmentDecision>>;
  try {
    result = await applyAdjustmentDecision(decisionId);
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof AdjustmentDecisionNotFoundError) notFound();
    return getUnexpectedApplyFailureState();
  }

  if (result.status === "not_applied") return getAdjustmentFailureState(result.reason);
  redirect(`/brew/${result.brewPlanId}`);
}

export async function saveAdjustmentDecisionAction(
  brewPlanId: string,
  sessionId: string,
  _previousState: AdjustmentFormState,
  formData: FormData,
): Promise<AdjustmentFormState> {
  if (!UUID_PATTERN.test(brewPlanId) || !UUID_PATTERN.test(sessionId)) notFound();
  const { supabase, user } = await requireUser();
  const context = await getFeedbackFlowContext(supabase, user.id, brewPlanId, sessionId);
  if (!context || context.session.status !== "completed") notFound();

  const feedback = await getTasteFeedbackBySession(supabase, user.id, sessionId);
  if (!feedback) return { message: "Taste Feedback must be saved before choosing an adjustment." };
  const existing = await getAdjustmentDecisionByFeedback(supabase, user.id, feedback.id);
  if (existing) redirect(`/brew/${brewPlanId}/session/${sessionId}/feedback`);

  const selectedDirectionValue = formData.get("selectedDirection");
  const selectedCandidateValue = formData.get("selectedCandidateId");
  if (typeof selectedDirectionValue !== "string" || !isAdjustmentDirection(selectedDirectionValue)) {
    return { message: "Choose what you want to improve first." };
  }
  const selectedCandidateId = typeof selectedCandidateValue === "string" && selectedCandidateValue
    ? selectedCandidateValue
    : undefined;

  try {
    const decision = buildAdjustmentDecision({
      inferredDirections: interpretTasteFeedback(feedback),
      selectedCandidateId,
      selectedDirection: selectedDirectionValue,
      tasteFeedbackId: feedback.id,
    });
    await createAdjustmentDecision(supabase, user.id, decision);
  } catch (error) {
    if (error instanceof InvalidAdjustmentDecisionError) return { message: error.message };
    return { message: "We could not save this adjustment. Please try again." };
  }

  revalidatePath(`/brew/${brewPlanId}/session/${sessionId}/feedback`);
  redirect(`/brew/${brewPlanId}/session/${sessionId}/feedback`);
}
