import type { SupabaseClient } from "@supabase/supabase-js";

import { getOriginLabel, isOriginCode } from "@/domain/coffee/bean-profile";
import { isQuickFeedback, type QuickFeedback } from "@/domain/taste/feedback";
import { isTasteGoal } from "@/domain/taste/taste-goal";
import {
  isAdjustmentDirection,
  type AdjustmentCandidateSnapshot,
  type AdjustmentDecisionStatus,
  type AdjustmentDirection,
} from "@/features/adjustment/types";
import { isRecommendationSource } from "@/features/brew-plan/types";
import type { BrewSessionStatus } from "@/features/brew-session/types";
import type { CoffeeStatus } from "@/features/coffee/types";
import type { Database, Json } from "@/types/database";

import { assembleDialInThreadSummaries } from "./model";
import type {
  DialInHistoryCoffeeRecord,
  DialInHistoryDecisionRecord,
  DialInHistoryFeedbackRecord,
  DialInHistoryPlanRecord,
  DialInHistorySessionRecord,
  DialInHistorySource,
  DialInHistoryThreadRecord,
} from "./types";

const COFFEE_SELECT = `
  id,
  user_id,
  product_name,
  status,
  bean_profiles!coffees_owned_bean_profile_fkey (
    origin_country_code,
    region
  )
`;

const PLAN_SELECT = `
  based_on_session_id,
  coffee_dose,
  coffee_id,
  created_at,
  dial_in_thread_id,
  grind_level,
  id,
  parent_plan_id,
  ratio,
  recommendation_source,
  recipe_template_id,
  target_brew_time_max,
  target_brew_time_min,
  user_id,
  water_amount,
  water_temperature
`;

const SESSION_SELECT = `
  actual_brew_time,
  brew_plan_id,
  created_at,
  finished_at,
  id,
  started_at,
  status,
  user_id
`;

const FEEDBACK_SELECT = `
  acidity,
  body,
  brew_session_id,
  clarity,
  complexity,
  created_at,
  flavor_tags,
  id,
  juiciness,
  notes,
  overall_rating,
  pretty_good,
  too_sour,
  too_bitter,
  too_weak,
  too_strong,
  sweetness,
  astringent,
  user_id
`;

const DECISION_SELECT = `
  applied_brew_plan_id,
  created_at,
  id,
  inferred_directions,
  recommended_candidate,
  selected_candidate,
  selected_direction,
  status,
  taste_feedback_id,
  user_id
`;

type CoffeeRow = {
  bean_profiles: { origin_country_code: string; region: string | null };
  id: string;
  product_name: string | null;
  status: string;
  user_id: string;
};

type ThreadRow = Database["public"]["Tables"]["dial_in_threads"]["Row"];
type PlanRow = Pick<Database["public"]["Tables"]["brew_plans"]["Row"],
  | "based_on_session_id"
  | "coffee_dose"
  | "coffee_id"
  | "created_at"
  | "dial_in_thread_id"
  | "grind_level"
  | "id"
  | "parent_plan_id"
  | "ratio"
  | "recommendation_source"
  | "recipe_template_id"
  | "target_brew_time_max"
  | "target_brew_time_min"
  | "user_id"
  | "water_amount"
  | "water_temperature"
>;
type SessionRow = Pick<Database["public"]["Tables"]["brew_sessions"]["Row"],
  | "actual_brew_time"
  | "brew_plan_id"
  | "created_at"
  | "finished_at"
  | "id"
  | "started_at"
  | "status"
  | "user_id"
>;
type FeedbackRow = Pick<Database["public"]["Tables"]["taste_feedback"]["Row"],
  | "acidity"
  | "astringent"
  | "body"
  | "brew_session_id"
  | "clarity"
  | "complexity"
  | "created_at"
  | "flavor_tags"
  | "id"
  | "juiciness"
  | "notes"
  | "overall_rating"
  | "pretty_good"
  | "too_bitter"
  | "too_sour"
  | "too_strong"
  | "too_weak"
  | "sweetness"
  | "user_id"
>;
type DecisionRow = Pick<Database["public"]["Tables"]["adjustment_decisions"]["Row"],
  | "applied_brew_plan_id"
  | "created_at"
  | "id"
  | "inferred_directions"
  | "recommended_candidate"
  | "selected_candidate"
  | "selected_direction"
  | "status"
  | "taste_feedback_id"
  | "user_id"
>;
type RecipeTemplateRow = Pick<Database["public"]["Tables"]["recipe_templates"]["Row"], "id" | "name">;

export class DialInHistoryReadError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DialInHistoryReadError";
  }
}

function isCoffeeStatus(value: string): value is CoffeeStatus {
  return value === "active" || value === "archived" || value === "finished";
}

function isSessionStatus(value: string): value is BrewSessionStatus {
  return value === "aborted" || value === "brewing" || value === "completed";
}

function isDecisionStatus(value: string): value is AdjustmentDecisionStatus {
  return value === "applied" || value === "held" || value === "pending" || value === "unsupported";
}

function isCandidateSnapshot(value: Json | null): value is AdjustmentCandidateSnapshot {
  if (!value || Array.isArray(value) || typeof value !== "object") return false;
  const candidate = value as Record<string, Json | undefined>;
  const parameter = candidate.parameter;
  const direction = candidate.changeDirection;
  return Object.keys(candidate).length === 4
    && (parameter === "grind" || parameter === "temperature" || parameter === "water")
    && (direction === "coarser" || direction === "finer" || direction === "higher" || direction === "lower")
    && candidate.evidenceClassification === "product_heuristic"
    && typeof candidate.reason === "string"
    && candidate.reason.trim().length > 0;
}

function parseDirections(values: string[]): AdjustmentDirection[] {
  if (values.length === 0 || values.some((value) => !isAdjustmentDirection(value))) {
    throw new DialInHistoryReadError("Dial-in history contains invalid inferred directions.");
  }
  return values as AdjustmentDirection[];
}

function toCoffeeRecord(row: CoffeeRow): DialInHistoryCoffeeRecord {
  if (!isCoffeeStatus(row.status) || !isOriginCode(row.bean_profiles.origin_country_code)) {
    throw new DialInHistoryReadError("Dial-in history contains invalid Coffee values.");
  }
  return {
    displayName: row.product_name ?? [
      getOriginLabel(row.bean_profiles.origin_country_code),
      row.bean_profiles.region,
    ].filter(Boolean).join(" "),
    id: row.id,
    status: row.status,
    userId: row.user_id,
  };
}

function toThreadRecord(row: ThreadRow): DialInHistoryThreadRecord {
  if (
    !isTasteGoal(row.primary_taste_goal)
    || (row.secondary_taste_goal !== null && !isTasteGoal(row.secondary_taste_goal))
  ) {
    throw new DialInHistoryReadError("Dial-in history contains invalid Taste Goals.");
  }
  return {
    coffeeId: row.coffee_id,
    createdAt: row.created_at,
    id: row.id,
    primaryTasteGoal: row.primary_taste_goal,
    secondaryTasteGoal: row.secondary_taste_goal,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

function toPlanRecord(row: PlanRow): DialInHistoryPlanRecord {
  if (!isRecommendationSource(row.recommendation_source)) {
    throw new DialInHistoryReadError("Dial-in history contains an invalid recommendation source.");
  }
  return {
    basedOnSessionId: row.based_on_session_id,
    coffeeDose: row.coffee_dose,
    coffeeId: row.coffee_id,
    createdAt: row.created_at,
    dialInThreadId: row.dial_in_thread_id,
    grindLevel: row.grind_level,
    id: row.id,
    parentPlanId: row.parent_plan_id,
    ratio: row.ratio,
    recommendationSource: row.recommendation_source,
    recipeTemplateId: row.recipe_template_id,
    targetBrewTimeMax: row.target_brew_time_max,
    targetBrewTimeMin: row.target_brew_time_min,
    userId: row.user_id,
    waterAmount: row.water_amount,
    waterTemperature: row.water_temperature,
  };
}

function toSessionRecord(row: SessionRow): DialInHistorySessionRecord {
  if (!isSessionStatus(row.status)) {
    throw new DialInHistoryReadError("Dial-in history contains an invalid Brew Session status.");
  }
  return {
    actualBrewTime: row.actual_brew_time,
    brewPlanId: row.brew_plan_id,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
    id: row.id,
    startedAt: row.started_at,
    status: row.status,
    userId: row.user_id,
  };
}

function toFeedbackRecord(row: FeedbackRow): DialInHistoryFeedbackRecord {
  const quickFeedback = ([
    "pretty_good",
    "too_sour",
    "too_bitter",
    "too_weak",
    "too_strong",
    "astringent",
  ] as const).filter((key) => row[key] && isQuickFeedback(key)) as QuickFeedback[];
  return {
    acidity: row.acidity,
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
    quickFeedback,
    sweetness: row.sweetness,
    userId: row.user_id,
  };
}

function toDecisionRecord(row: DecisionRow): DialInHistoryDecisionRecord {
  if (!isDecisionStatus(row.status) || !isAdjustmentDirection(row.selected_direction)) {
    throw new DialInHistoryReadError("Dial-in history contains an invalid Adjustment Decision status.");
  }
  if (row.recommended_candidate !== null && !isCandidateSnapshot(row.recommended_candidate)) {
    throw new DialInHistoryReadError("Dial-in history contains an invalid recommended candidate.");
  }
  if (row.selected_candidate !== null && !isCandidateSnapshot(row.selected_candidate)) {
    throw new DialInHistoryReadError("Dial-in history contains an invalid selected candidate.");
  }
  return {
    appliedBrewPlanId: row.applied_brew_plan_id,
    createdAt: row.created_at,
    id: row.id,
    inferredDirections: parseDirections(row.inferred_directions),
    recommendedCandidate: row.recommended_candidate,
    selectedCandidate: row.selected_candidate,
    selectedDirection: row.selected_direction,
    status: row.status,
    tasteFeedbackId: row.taste_feedback_id,
    userId: row.user_id,
  };
}

async function loadRelatedRows(
  supabase: SupabaseClient<Database>,
  userId: string,
  threadRows: ThreadRow[],
): Promise<DialInHistorySource> {
  if (threadRows.length === 0) {
    return { coffees: [], decisions: [], feedback: [], plans: [], recipeTemplates: [], sessions: [], threads: [] };
  }

  const coffeeIds = [...new Set(threadRows.map(({ coffee_id }) => coffee_id))];
  const threadIds = threadRows.map(({ id }) => id);
  const [coffeeResult, planResult] = await Promise.all([
    supabase.from("coffees").select(COFFEE_SELECT).eq("user_id", userId).in("id", coffeeIds),
    supabase.from("brew_plans").select(PLAN_SELECT).eq("user_id", userId).in("dial_in_thread_id", threadIds),
  ]);
  if (coffeeResult.error) throw new DialInHistoryReadError("Unable to load Dial-in Coffee summaries.", { cause: coffeeResult.error });
  if (planResult.error) throw new DialInHistoryReadError("Unable to load Dial-in Brew Plans.", { cause: planResult.error });

  const planRows = planResult.data as PlanRow[];
  const recipeTemplateIds = [...new Set(planRows.flatMap(({ recipe_template_id }) => (
    recipe_template_id ? [recipe_template_id] : []
  )))];
  let recipeTemplateRows: RecipeTemplateRow[] = [];
  if (recipeTemplateIds.length > 0) {
    const { data, error } = await supabase
      .from("recipe_templates")
      .select("id, name")
      .in("id", recipeTemplateIds);
    if (!error) recipeTemplateRows = data as RecipeTemplateRow[];
  }
  const planIds = planRows.map(({ id }) => id);
  let sessionRows: SessionRow[] = [];
  if (planIds.length > 0) {
    const { data, error } = await supabase
      .from("brew_sessions")
      .select(SESSION_SELECT)
      .eq("user_id", userId)
      .in("brew_plan_id", planIds);
    if (error) throw new DialInHistoryReadError("Unable to load Dial-in Brew Sessions.", { cause: error });
    sessionRows = data as SessionRow[];
  }

  const sessionIds = sessionRows.map(({ id }) => id);
  let feedbackRows: FeedbackRow[] = [];
  if (sessionIds.length > 0) {
    const { data, error } = await supabase
      .from("taste_feedback")
      .select(FEEDBACK_SELECT)
      .eq("user_id", userId)
      .in("brew_session_id", sessionIds);
    if (error) throw new DialInHistoryReadError("Unable to load Dial-in Taste Feedback.", { cause: error });
    feedbackRows = data as FeedbackRow[];
  }

  const feedbackIds = feedbackRows.map(({ id }) => id);
  let decisionRows: DecisionRow[] = [];
  if (feedbackIds.length > 0) {
    const { data, error } = await supabase
      .from("adjustment_decisions")
      .select(DECISION_SELECT)
      .eq("user_id", userId)
      .in("taste_feedback_id", feedbackIds);
    if (error) throw new DialInHistoryReadError("Unable to load Dial-in Adjustment Decisions.", { cause: error });
    decisionRows = data as DecisionRow[];
  }

  return {
    coffees: (coffeeResult.data as CoffeeRow[]).map(toCoffeeRecord),
    decisions: decisionRows.map(toDecisionRecord),
    feedback: feedbackRows.map(toFeedbackRecord),
    plans: planRows.map(toPlanRecord),
    recipeTemplates: recipeTemplateRows,
    sessions: sessionRows.map(toSessionRecord),
    threads: threadRows.map(toThreadRecord),
  };
}

export async function listDialInThreadSummaries(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("dial_in_threads")
    .select("*")
    .eq("user_id", userId);
  if (error) throw new DialInHistoryReadError("Unable to load Dial-in Threads.", { cause: error });
  const source = await loadRelatedRows(supabase, userId, data);
  return assembleDialInThreadSummaries(userId, source);
}

export async function listDialInThreadSummariesForCoffee(
  supabase: SupabaseClient<Database>,
  userId: string,
  coffeeId: string,
) {
  const { data, error } = await supabase
    .from("dial_in_threads")
    .select("*")
    .eq("user_id", userId)
    .eq("coffee_id", coffeeId);
  if (error) throw new DialInHistoryReadError("Unable to load Coffee Dial-in Threads.", { cause: error });
  const source = await loadRelatedRows(supabase, userId, data);
  return assembleDialInThreadSummaries(userId, source);
}
