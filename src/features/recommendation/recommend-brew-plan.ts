import { ACTIVE_RECIPE_NAMES, type ActiveRecipeName, type OfficialRecipeTemplate } from "@/domain/recipe/types";
import { formatTasteGoals } from "@/domain/taste/taste-goal";

import {
  PROCESS_RULE_WEIGHTS,
  RECIPE_DEFAULTS,
  RECIPE_TIE_BREAK_ORDER,
  REGION_RULE_WEIGHTS,
  ROAST_RULE_WEIGHTS,
  SECONDARY_TASTE_GOAL_MULTIPLIER,
  TASTE_GOAL_RULE_WEIGHTS,
} from "./config";
import type { RecommendationInput, RecommendedBrewPlan, RecipeScore, ScoreContribution } from "./types";

type RuleWeights = Partial<Record<ActiveRecipeName, { points: number; reason: string }>>;

function addWeights(
  scores: Map<ActiveRecipeName, ScoreContribution[]>,
  weights: RuleWeights,
  rule: ScoreContribution["rule"],
  multiplier = 1,
) {
  for (const [recipeName, preference] of Object.entries(weights) as [ActiveRecipeName, { points: number; reason: string }][]) {
    scores.get(recipeName)?.push({
      points: preference.points * multiplier,
      reason: preference.reason,
      rule,
    });
  }
}

function getRecipeScores(input: RecommendationInput) {
  const contributions = new Map<ActiveRecipeName, ScoreContribution[]>(
    ACTIVE_RECIPE_NAMES.map((name) => [name, []]),
  );

  const regionWeights = input.beanProfile.region
    ? (REGION_RULE_WEIGHTS as Readonly<Record<string, RuleWeights>>)[input.beanProfile.region]
    : undefined;

  if (regionWeights) {
    addWeights(contributions, regionWeights, "region");
  }

  addWeights(contributions, PROCESS_RULE_WEIGHTS[input.beanProfile.process], "process");
  addWeights(contributions, ROAST_RULE_WEIGHTS[input.beanProfile.roastLevel], "roast");
  addWeights(contributions, TASTE_GOAL_RULE_WEIGHTS[input.primaryTasteGoal], "primary_taste_goal");

  if (input.secondaryTasteGoal) {
    addWeights(
      contributions,
      TASTE_GOAL_RULE_WEIGHTS[input.secondaryTasteGoal],
      "secondary_taste_goal",
      SECONDARY_TASTE_GOAL_MULTIPLIER,
    );
  }

  return ACTIVE_RECIPE_NAMES.map<RecipeScore>((recipeName) => {
    const recipeContributions = contributions.get(recipeName) ?? [];
    return {
      contributions: recipeContributions,
      recipeName,
      total: recipeContributions.reduce((sum, contribution) => sum + contribution.points, 0),
    };
  });
}

function rankScores(scores: readonly RecipeScore[]) {
  return [...scores].sort((left, right) => {
    if (right.total !== left.total) return right.total - left.total;
    return RECIPE_TIE_BREAK_ORDER.indexOf(left.recipeName) - RECIPE_TIE_BREAK_ORDER.indexOf(right.recipeName);
  });
}

function createReasoning(input: RecommendationInput, selected: RecipeScore, ranked: readonly RecipeScore[]) {
  const ruleLabels: Record<ScoreContribution["rule"], string> = {
    primary_taste_goal: "Primary taste goal",
    process: "Process",
    region: "Region",
    roast: "Roast level",
    secondary_taste_goal: "Secondary taste goal (half weight)",
  };
  const selectedReasons = selected.contributions.map(
    ({ points, reason, rule }) => `${ruleLabels[rule]} +${points}: ${reason}`,
  );
  const regionReason = input.beanProfile.region
    ? `No calibrated rule is defined for the free-form region “${input.beanProfile.region}”, so region did not change the score.`
    : "Region was not provided, so the recommendation uses process, roast level, and taste goals as a conservative fallback.";
  const scoreSummary = ranked.map(({ recipeName, total }) => `${recipeName} ${total}`).join(", ");

  return [
    `You selected ${formatTasteGoals(input.primaryTasteGoal, input.secondaryTasteGoal)}.`,
    regionReason,
    ...selectedReasons,
    `${selected.recipeName} ranked first (${scoreSummary}); ties use the fixed Three Pour, 4:6, One Pour order.`,
    "Recommended starting point — not a guaranteed best recipe.",
  ];
}

function assertRecommendationInput(input: RecommendationInput) {
  if (input.brewer !== "v60") {
    throw new Error("MVP recommendations support V60 only.");
  }

  if (input.secondaryTasteGoal === input.primaryTasteGoal) {
    throw new Error("Secondary taste goal must differ from primary taste goal.");
  }
}

function selectTemplate(
  recipes: readonly OfficialRecipeTemplate[],
  recipeName: ActiveRecipeName,
) {
  const recipe = recipes.find((candidate) => candidate.name === recipeName);
  if (!recipe) throw new Error(`Official recipe ${recipeName} is unavailable.`);
  return recipe;
}

export function recommendBrewPlan(
  input: RecommendationInput,
  recipes: readonly OfficialRecipeTemplate[],
): RecommendedBrewPlan {
  assertRecommendationInput(input);

  const compatibleRecipes = recipes.filter(
    (recipe) => recipe.brewerType === "v60" && recipe.source === "official" && recipe.isPublic,
  );

  for (const name of ACTIVE_RECIPE_NAMES) {
    selectTemplate(compatibleRecipes, name);
  }

  const rankedScores = rankScores(getRecipeScores(input));
  const selectedScore = rankedScores[0];
  if (!selectedScore) throw new Error("No compatible official recipe is available.");

  const recipeTemplate = selectTemplate(compatibleRecipes, selectedScore.recipeName);
  const defaults = RECIPE_DEFAULTS[recipeTemplate.name];
  const waterAmount = Number((defaults.coffeeDose * recipeTemplate.defaultRatio).toFixed(2));

  return {
    coffeeDose: defaults.coffeeDose,
    expectedFlavor: recipeTemplate.expectedFlavor,
    grindLevel: recipeTemplate.defaultGrindLevel,
    ratio: recipeTemplate.defaultRatio,
    reasoning: createReasoning(input, selectedScore, rankedScores),
    recipeScore: selectedScore,
    recipeTemplate,
    scoreBreakdown: rankedScores,
    source: "official_rule",
    steps: recipeTemplate.steps.map((step) => ({ ...step })),
    targetBrewTimeMax: defaults.targetBrewTimeMax,
    targetBrewTimeMin: defaults.targetBrewTimeMin,
    waterAmount,
    waterTemperature: recipeTemplate.defaultTemperature,
  };
}
