import { formatTasteGoals } from "@/domain/taste/taste-goal";
import type { BrewPlan } from "@/features/brew-plan/types";
import { getCoffeeDisplayName } from "@/features/coffee/coffee-display";

import type { GuidedBrewPlanSnapshot } from "./types";

export function createGuidedBrewPlanSnapshot(plan: BrewPlan): GuidedBrewPlanSnapshot {
  return {
    brewPlanId: plan.id,
    coffeeDose: plan.coffeeDose,
    coffeeName: getCoffeeDisplayName(plan.coffee),
    grindLevel: plan.grindLevel,
    ratio: plan.ratio,
    recipeName: plan.recipeName ?? "Custom Plan",
    steps: plan.steps.map((step) => ({ ...step })),
    targetBrewTimeMax: plan.targetBrewTimeMax,
    targetBrewTimeMin: plan.targetBrewTimeMin,
    tasteGoal: formatTasteGoals(plan.primaryTasteGoal, plan.secondaryTasteGoal),
    waterAmount: plan.waterAmount,
    waterTemperature: plan.waterTemperature,
  };
}
