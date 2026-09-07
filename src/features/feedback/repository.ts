import type { SupabaseClient } from "@supabase/supabase-js";

import { getBrewPlan } from "@/features/brew-plan/repository";
import { getBrewSession } from "@/features/brew-session/repository";
import type { Database } from "@/types/database";

import type { FeedbackFlowContext, TasteFeedback, TasteFeedbackInput } from "./types";

type TasteFeedbackRow = Database["public"]["Tables"]["taste_feedback"]["Row"];

export class FeedbackPersistenceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "FeedbackPersistenceError";
  }
}

function toTasteFeedback(row: TasteFeedbackRow): TasteFeedback {
  return {
    acidity: row.acidity,
    astringent: row.astringent,
    body: row.body,
    brewSessionId: row.brew_session_id,
    clarity: row.clarity,
    complexity: row.complexity,
    createdAt: row.created_at,
    flavorTags: row.flavor_tags,
    id: row.id,
    juiciness: row.juiciness,
    notes: row.notes,
    overallRating: row.overall_rating,
    pretty_good: row.pretty_good,
    sweetness: row.sweetness,
    too_bitter: row.too_bitter,
    too_sour: row.too_sour,
    too_strong: row.too_strong,
    too_weak: row.too_weak,
  };
}

export async function getFeedbackFlowContext(
  supabase: SupabaseClient<Database>,
  userId: string,
  brewPlanId: string,
  sessionId: string,
): Promise<FeedbackFlowContext | null> {
  const [plan, session] = await Promise.all([
    getBrewPlan(supabase, userId, brewPlanId),
    getBrewSession(supabase, userId, sessionId),
  ]);
  if (!plan || !session || session.brewPlanId !== plan.id) return null;

  return {
    coffeeId: plan.coffee.id,
    session: {
      actualBrewTime: session.actualBrewTime,
      brewPlanId: session.brewPlanId,
      id: session.id,
      status: session.status,
    },
    targetBrewTimeMax: plan.targetBrewTimeMax,
    targetBrewTimeMin: plan.targetBrewTimeMin,
  };
}

export async function getTasteFeedbackBySession(
  supabase: SupabaseClient<Database>,
  userId: string,
  sessionId: string,
) {
  const { data, error } = await supabase
    .from("taste_feedback")
    .select("*")
    .eq("brew_session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new FeedbackPersistenceError("Unable to load Taste Feedback.", { cause: error });
  return data ? toTasteFeedback(data) : null;
}

export async function createTasteFeedback(
  supabase: SupabaseClient<Database>,
  userId: string,
  sessionId: string,
  input: TasteFeedbackInput,
) {
  const { error } = await supabase.from("taste_feedback").upsert({
    acidity: input.acidity,
    astringent: input.astringent,
    body: input.body,
    brew_session_id: sessionId,
    clarity: input.clarity,
    complexity: input.complexity,
    flavor_tags: input.flavorTags,
    juiciness: input.juiciness,
    notes: input.notes,
    overall_rating: input.overallRating,
    pretty_good: input.pretty_good,
    sweetness: input.sweetness,
    too_bitter: input.too_bitter,
    too_sour: input.too_sour,
    too_strong: input.too_strong,
    too_weak: input.too_weak,
    user_id: userId,
  }, { ignoreDuplicates: true, onConflict: "brew_session_id" });

  if (error) throw new FeedbackPersistenceError("Unable to save Taste Feedback.", { cause: error });
  const feedback = await getTasteFeedbackBySession(supabase, userId, sessionId);
  if (!feedback) throw new FeedbackPersistenceError("Saved Taste Feedback could not be loaded.");
  return feedback;
}
