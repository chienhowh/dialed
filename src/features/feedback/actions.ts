"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { buildAdjustmentDecision } from "@/features/adjustment/decision";
import { shouldPersistDecisionWithFeedback } from "@/features/adjustment/config";
import { interpretTasteFeedback } from "@/features/adjustment/interpret";
import { createAdjustmentDecision, getAdjustmentDecisionByFeedback } from "@/features/adjustment/repository";
import { requireUser } from "@/features/auth/require-user";

import { parseFeedbackFormData, type FeedbackFormState } from "./form";
import { createTasteFeedback, getFeedbackFlowContext } from "./repository";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function submitTasteFeedbackAction(
  brewPlanId: string,
  sessionId: string,
  _previousState: FeedbackFormState,
  formData: FormData,
): Promise<FeedbackFormState> {
  if (!UUID_PATTERN.test(brewPlanId) || !UUID_PATTERN.test(sessionId)) notFound();
  const parsed = parseFeedbackFormData(formData);
  if (!parsed.success) {
    return { errors: parsed.errors, message: "Check your feedback.", values: parsed.values };
  }

  const { supabase, user } = await requireUser();
  const context = await getFeedbackFlowContext(supabase, user.id, brewPlanId, sessionId);
  if (!context || context.session.status !== "completed") notFound();

  try {
    const feedback = await createTasteFeedback(supabase, user.id, sessionId, parsed.data);
    const existingDecision = await getAdjustmentDecisionByFeedback(supabase, user.id, feedback.id);
    if (!existingDecision) {
      const inferredDirections = interpretTasteFeedback(feedback);
      const selectedDirection = inferredDirections.length === 1 ? inferredDirections[0] : null;
      if (selectedDirection && shouldPersistDecisionWithFeedback(selectedDirection)) {
        await createAdjustmentDecision(supabase, user.id, buildAdjustmentDecision({
          inferredDirections,
          selectedDirection,
          tasteFeedbackId: feedback.id,
        }));
      }
    }
  } catch {
    return { message: "We could not save your feedback. Please try again." };
  }

  revalidatePath(`/brew/${brewPlanId}/session/${sessionId}/feedback`);
  redirect(`/brew/${brewPlanId}/session/${sessionId}/feedback`);
}
