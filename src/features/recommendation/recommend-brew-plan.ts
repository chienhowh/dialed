import type { ActiveRecipeName, OfficialRecipeTemplate } from "@/domain/recipe/types";
import { getTasteGoalLabel } from "@/domain/taste/taste-goal";

import {
  NEUTRAL_FALLBACK,
  RECIPE_DEFAULTS,
  ROAST_STARTING_PARAMETER_RULES,
  STRATEGY_RULES,
  type StrategyRule,
} from "./config";
import type {
  RecommendationInput,
  RecommendationReason,
  RecommendedBrewPlan,
  StartingParameters,
} from "./types";

function assertRecommendationInput(input: RecommendationInput) {
  if (input.brewer !== "v60") {
    throw new Error("MVP recommendations support V60 only.");
  }

  if (input.secondaryTasteGoal === input.primaryTasteGoal) {
    throw new Error("Secondary taste goal must differ from primary taste goal.");
  }
}

function createFallbackReason(input: RecommendationInput): RecommendationReason {
  const primaryGoal = getTasteGoalLabel(input.primaryTasteGoal);
  const secondaryContext = input.secondaryTasteGoal
    ? ` ${getTasteGoalLabel(input.secondaryTasteGoal)} remains secondary context and did not change this starting point.`
    : "";

  return {
    evidence: "neutral_fallback",
    message: `No reviewed strategy rule is available for the primary ${primaryGoal} goal.${secondaryContext} Dialed used its neutral V60 baseline.`,
  };
}

function resolveStrategy(input: RecommendationInput): StrategyRule {
  const supportedRule = STRATEGY_RULES[input.primaryTasteGoal];
  if (supportedRule) return supportedRule;

  return {
    ...NEUTRAL_FALLBACK,
    reasons: [createFallbackReason(input), ...NEUTRAL_FALLBACK.reasons],
  };
}

function selectTemplate(
  recipes: readonly OfficialRecipeTemplate[],
  recipeName: ActiveRecipeName,
) {
  const recipe = recipes.find((candidate) => candidate.name === recipeName);
  if (!recipe) throw new Error(`Official recipe ${recipeName} is unavailable for the selected strategy.`);
  return recipe;
}

function createStartingParameters(
  recipeTemplate: OfficialRecipeTemplate,
  input: RecommendationInput,
): { parameters: StartingParameters; reasons: readonly RecommendationReason[] } {
  const defaults = RECIPE_DEFAULTS[recipeTemplate.name];
  const roastRule = ROAST_STARTING_PARAMETER_RULES[input.beanProfile.roastLevel];
  const ratio = roastRule?.overrides.ratio ?? recipeTemplate.defaultRatio;
  const coffeeDose = defaults.coffeeDose;

  return {
    parameters: {
      coffeeDose,
      expectedFlavor: recipeTemplate.expectedFlavor,
      grindLevel: roastRule?.overrides.grindLevel ?? recipeTemplate.defaultGrindLevel,
      ratio,
      steps: recipeTemplate.steps.map((step) => ({ ...step })),
      targetBrewTimeMax: defaults.targetBrewTimeMax,
      targetBrewTimeMin: defaults.targetBrewTimeMin,
      waterAmount: Number((coffeeDose * ratio).toFixed(2)),
      waterTemperature: roastRule?.overrides.waterTemperature ?? recipeTemplate.defaultTemperature,
    },
    reasons: roastRule ? [roastRule.reason] : [],
  };
}

export function recommendBrewPlan(
  input: RecommendationInput,
  recipes: readonly OfficialRecipeTemplate[],
): RecommendedBrewPlan {
  assertRecommendationInput(input);

  const compatibleRecipes = recipes.filter(
    (recipe) => recipe.brewerType === "v60" && recipe.source === "official" && recipe.isPublic,
  );
  const strategyRule = resolveStrategy(input);
  const recipeTemplate = selectTemplate(compatibleRecipes, strategyRule.recipeName);
  const startingPoint = createStartingParameters(recipeTemplate, input);

  return {
    reasons: [...strategyRule.reasons, ...startingPoint.reasons],
    recipeTemplate,
    source: "official_rule",
    startingParameters: startingPoint.parameters,
    strategy: strategyRule.strategy,
  };
}
