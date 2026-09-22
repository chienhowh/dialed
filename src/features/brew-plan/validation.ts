import type { BrewPlan, BrewPlanEditInput } from "./types";

export const BREW_PLAN_AMOUNT_TOLERANCE = 0.1;

function roundToHundredth(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function differsBeyondTolerance(left: number, right: number) {
  return Math.abs(left - right) > BREW_PLAN_AMOUNT_TOLERANCE + Number.EPSILON;
}

export function validateBrewPlanEditStructure(plan: BrewPlan, input: BrewPlanEditInput) {
  const errors: Record<string, string> = {};
  const expectedWater = roundToHundredth(input.coffeeDose * input.ratio);
  if (differsBeyondTolerance(input.waterAmount, expectedWater)) {
    errors.waterAmount = `Water must match dose × ratio (${expectedWater}g, within ${BREW_PLAN_AMOUNT_TOLERANCE}g).`;
  }

  const savedSteps = new Map(plan.steps.map((step) => [step.id, step]));
  const steps = input.steps.map((step) => ({ ...step, source: savedSteps.get(step.id) }));
  if (steps[0]?.startTime !== 0) {
    errors[`step.${steps[0]?.id}.startTime`] = "The first step must start at 0 seconds.";
  }
  steps.forEach((step, index) => {
    const previous = steps[index - 1];
    if (previous && step.startTime <= previous.startTime) {
      errors[`step.${step.id}.startTime`] = "Step start times must move forward in Plan order.";
    }
    if (
      previous
      && previous.duration !== null
      && step.startTime < previous.startTime + previous.duration
    ) {
      errors[`step.${step.id}.startTime`] = "A step cannot start before the previous timed step ends.";
    }
  });

  const finalStep = steps.at(-1);
  if (finalStep && input.targetBrewTimeMax < finalStep.startTime) {
    errors.targetBrewTimeMax = "Latest finish must be at or after the final step starts.";
  }

  const pours = steps.filter(({ source }) => source?.stepType === "pour");
  pours.forEach((pour, index) => {
    const previous = pours[index - 1];
    if (
      previous
      && previous.targetWater !== null
      && pour.targetWater !== null
      && pour.targetWater + BREW_PLAN_AMOUNT_TOLERANCE < previous.targetWater
    ) {
      errors[`step.${pour.id}.targetWater`] = "Cumulative Pour targets cannot move backward.";
    }
  });
  const finalPour = pours.at(-1);
  if (!finalPour || finalPour.targetWater === null) {
    errors.steps = "The Brew Plan must include a final cumulative Pour target.";
  } else if (differsBeyondTolerance(finalPour.targetWater, input.waterAmount)) {
    errors[`step.${finalPour.id}.targetWater`] = `The final cumulative Pour target must equal total water within ${BREW_PLAN_AMOUNT_TOLERANCE}g.`;
  }

  return errors;
}
