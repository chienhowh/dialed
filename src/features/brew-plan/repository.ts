import type { SupabaseClient } from "@supabase/supabase-js";

import { isActiveRecipeName, type BrewStepType, type OfficialRecipeTemplate } from "@/domain/recipe/types";
import { isTasteGoal } from "@/domain/taste/taste-goal";
import { getCoffee } from "@/features/coffee/repository";
import type { Coffee } from "@/features/coffee/types";
import { recommendBrewPlan } from "@/features/recommendation/recommend-brew-plan";
import type { Database } from "@/types/database";

import type { TasteGoalInput } from "./taste-goal-form";
import type { BrewPlan, BrewPlanEditInput } from "./types";

const ACTIVE_RECIPE_SELECT = `
  id,
  name,
  brewer_type,
  description,
  default_ratio,
  default_temperature,
  default_grind_level,
  expected_flavor,
  source,
  is_public,
  recipe_steps (
    step_order,
    step_type,
    start_time,
    duration,
    target_water,
    note
  )
`;

const BREW_PLAN_SELECT = `
  id,
  coffee_id,
  dial_in_thread_id,
  recipe_template_id,
  coffee_dose,
  water_amount,
  ratio,
  water_temperature,
  grind_level,
  target_brew_time_min,
  target_brew_time_max,
  expected_flavor,
  recommendation_source,
  recommendation_reason,
  dial_in_threads!brew_plans_owned_thread_fkey (
    primary_taste_goal,
    secondary_taste_goal
  ),
  recipe_templates (
    name
  ),
  brew_plan_steps (
    id,
    step_order,
    step_type,
    start_time,
    duration,
    target_water,
    note
  )
`;

type RecipeQueryRow = {
  brewer_type: string;
  default_grind_level: string;
  default_ratio: number;
  default_temperature: number;
  description: string;
  expected_flavor: string;
  id: string;
  is_public: boolean;
  name: string;
  recipe_steps: Array<{
    duration: number | null;
    note: string | null;
    start_time: number;
    step_order: number;
    step_type: string;
    target_water: number | null;
  }>;
  source: string;
};

type BrewPlanQueryRow = {
  brew_plan_steps: Array<{
    duration: number | null;
    id: string;
    note: string | null;
    start_time: number;
    step_order: number;
    step_type: string;
    target_water: number | null;
  }>;
  coffee_dose: number;
  coffee_id: string;
  dial_in_thread_id: string;
  dial_in_threads: {
    primary_taste_goal: string;
    secondary_taste_goal: string | null;
  };
  expected_flavor: string;
  grind_level: string;
  id: string;
  ratio: number;
  recipe_template_id: string | null;
  recipe_templates: { name: string } | null;
  recommendation_reason: string;
  recommendation_source: string;
  target_brew_time_max: number;
  target_brew_time_min: number;
  water_amount: number;
  water_temperature: number;
};

export class BrewPlanNotFoundError extends Error {
  constructor() {
    super("Brew plan not found.");
    this.name = "BrewPlanNotFoundError";
  }
}

function isBrewStepType(value: string): value is BrewStepType {
  return value === "pour" || value === "wait";
}

function toOfficialRecipe(row: RecipeQueryRow): OfficialRecipeTemplate {
  if (
    row.brewer_type !== "v60"
    || row.source !== "official"
    || row.is_public !== true
    || !isActiveRecipeName(row.name)
  ) {
    throw new Error("Recipe is not part of the active official V60 catalog.");
  }

  return {
    brewerType: "v60",
    defaultGrindLevel: row.default_grind_level,
    defaultRatio: row.default_ratio,
    defaultTemperature: row.default_temperature,
    description: row.description,
    expectedFlavor: row.expected_flavor,
    id: row.id,
    isPublic: true,
    name: row.name,
    source: "official",
    steps: [...row.recipe_steps]
      .sort((left, right) => left.step_order - right.step_order)
      .map((step) => {
        if (!isBrewStepType(step.step_type)) {
          throw new Error("Active recipe contains an unsupported step type.");
        }

        return {
          duration: step.duration,
          note: step.note,
          startTime: step.start_time,
          stepOrder: step.step_order,
          stepType: step.step_type,
          targetWater: step.target_water,
        };
      }),
  };
}

export async function listActiveOfficialRecipes(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from("recipe_templates")
    .select(ACTIVE_RECIPE_SELECT)
    .eq("brewer_type", "v60")
    .eq("source", "official")
    .eq("is_public", true)
    .in("name", ["Three Pour", "4:6", "One Pour"]);

  if (error) throw new Error("Unable to load official recipes.", { cause: error });
  return (data as RecipeQueryRow[]).map(toOfficialRecipe);
}

export async function createRecommendedBrewPlan(
  supabase: SupabaseClient<Database>,
  userId: string,
  coffee: Coffee,
  tasteGoals: TasteGoalInput,
) {
  const recipes = await listActiveOfficialRecipes(supabase);
  const recommendation = recommendBrewPlan({
    beanProfile: {
      process: coffee.beanProfile.process,
      region: coffee.beanProfile.region,
      roastLevel: coffee.beanProfile.roastLevel,
    },
    brewer: "v60",
    primaryTasteGoal: tasteGoals.primaryTasteGoal,
    secondaryTasteGoal: tasteGoals.secondaryTasteGoal,
  }, recipes);
  const dialInThreadId = crypto.randomUUID();
  const brewPlanId = crypto.randomUUID();

  const { error: threadError } = await supabase.from("dial_in_threads").insert({
    coffee_id: coffee.id,
    id: dialInThreadId,
    primary_taste_goal: tasteGoals.primaryTasteGoal,
    secondary_taste_goal: tasteGoals.secondaryTasteGoal,
    status: "active",
    user_id: userId,
  });

  if (threadError) throw new Error("Unable to create dial-in thread.", { cause: threadError });

  const { error: planError } = await supabase.from("brew_plans").insert({
    coffee_dose: recommendation.coffeeDose,
    coffee_id: coffee.id,
    dial_in_thread_id: dialInThreadId,
    expected_flavor: recommendation.expectedFlavor,
    grind_level: recommendation.grindLevel,
    id: brewPlanId,
    ratio: recommendation.ratio,
    recipe_template_id: recommendation.recipeTemplate.id,
    recommendation_reason: recommendation.reasoning.join("\n\n"),
    recommendation_source: recommendation.source,
    target_brew_time_max: recommendation.targetBrewTimeMax,
    target_brew_time_min: recommendation.targetBrewTimeMin,
    user_id: userId,
    water_amount: recommendation.waterAmount,
    water_temperature: recommendation.waterTemperature,
  });

  if (planError) {
    await supabase.from("dial_in_threads").delete().eq("id", dialInThreadId).eq("user_id", userId);
    throw new Error("Unable to create brew plan.", { cause: planError });
  }

  const { error: stepsError } = await supabase.from("brew_plan_steps").insert(
    recommendation.steps.map((step) => ({
      brew_plan_id: brewPlanId,
      duration: step.duration,
      id: crypto.randomUUID(),
      note: step.note,
      start_time: step.startTime,
      step_order: step.stepOrder,
      step_type: step.stepType,
      target_water: step.targetWater,
    })),
  );

  if (stepsError) {
    await supabase.from("dial_in_threads").delete().eq("id", dialInThreadId).eq("user_id", userId);
    throw new Error("Unable to snapshot recipe steps.", { cause: stepsError });
  }

  return brewPlanId;
}

function toBrewPlan(row: BrewPlanQueryRow, coffee: Coffee): BrewPlan {
  const primaryTasteGoal = row.dial_in_threads.primary_taste_goal;
  const secondaryTasteGoal = row.dial_in_threads.secondary_taste_goal;

  if (!isTasteGoal(primaryTasteGoal)) {
    throw new Error("Brew plan contains an invalid primary taste goal.");
  }

  if (secondaryTasteGoal !== null && !isTasteGoal(secondaryTasteGoal)) {
    throw new Error("Brew plan contains an invalid taste goal.");
  }

  if (row.recommendation_source !== "official_rule" && row.recommendation_source !== "manual") {
    throw new Error("Brew plan contains an unsupported recommendation source.");
  }

  return {
    coffee,
    coffeeDose: row.coffee_dose,
    dialInThreadId: row.dial_in_thread_id,
    expectedFlavor: row.expected_flavor,
    grindLevel: row.grind_level,
    id: row.id,
    primaryTasteGoal,
    ratio: row.ratio,
    recipeName: row.recipe_templates?.name ?? null,
    recipeTemplateId: row.recipe_template_id,
    recommendationReason: row.recommendation_reason,
    recommendationSource: row.recommendation_source,
    secondaryTasteGoal,
    steps: [...row.brew_plan_steps]
      .sort((left, right) => left.step_order - right.step_order)
      .map((step) => {
        if (!isBrewStepType(step.step_type)) throw new Error("Brew plan has an unsupported step type.");
        return {
          duration: step.duration,
          id: step.id,
          note: step.note,
          startTime: step.start_time,
          stepOrder: step.step_order,
          stepType: step.step_type,
          targetWater: step.target_water,
        };
      }),
    targetBrewTimeMax: row.target_brew_time_max,
    targetBrewTimeMin: row.target_brew_time_min,
    waterAmount: row.water_amount,
    waterTemperature: row.water_temperature,
  };
}

export async function getBrewPlan(
  supabase: SupabaseClient<Database>,
  userId: string,
  brewPlanId: string,
) {
  const { data, error } = await supabase
    .from("brew_plans")
    .select(BREW_PLAN_SELECT)
    .eq("id", brewPlanId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error("Unable to load brew plan.", { cause: error });
  if (!data) return null;

  const row = data as BrewPlanQueryRow;
  const coffee = await getCoffee(supabase, userId, row.coffee_id);
  return coffee ? toBrewPlan(row, coffee) : null;
}

const EDIT_NOTE = "This Brew Plan was manually edited after recommendation.";

export async function updateBrewPlan(
  supabase: SupabaseClient<Database>,
  userId: string,
  brewPlanId: string,
  input: BrewPlanEditInput,
) {
  const current = await getBrewPlan(supabase, userId, brewPlanId);
  if (!current) throw new BrewPlanNotFoundError();

  const currentStepIds = new Set(current.steps.map(({ id }) => id));
  if (input.steps.length !== currentStepIds.size || input.steps.some(({ id }) => !currentStepIds.has(id))) {
    throw new Error("Brew plan steps do not match the saved snapshot.");
  }

  for (const step of input.steps) {
    const { data, error } = await supabase
      .from("brew_plan_steps")
      .update({
        duration: step.duration,
        start_time: step.startTime,
        target_water: step.targetWater,
      })
      .eq("id", step.id)
      .eq("brew_plan_id", brewPlanId)
      .select("id")
      .maybeSingle();

    if (error || !data) throw new Error("Unable to update brew plan steps.", { cause: error });
  }

  const recommendationReason = current.recommendationReason.includes(EDIT_NOTE)
    ? current.recommendationReason
    : `${current.recommendationReason}\n\n${EDIT_NOTE}`;
  const { data, error } = await supabase
    .from("brew_plans")
    .update({
      coffee_dose: input.coffeeDose,
      grind_level: input.grindLevel,
      ratio: input.ratio,
      recommendation_reason: recommendationReason,
      recommendation_source: "manual",
      target_brew_time_max: input.targetBrewTimeMax,
      target_brew_time_min: input.targetBrewTimeMin,
      water_amount: input.waterAmount,
      water_temperature: input.waterTemperature,
    })
    .eq("id", brewPlanId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error || !data) throw new Error("Unable to update brew plan.", { cause: error });
}
