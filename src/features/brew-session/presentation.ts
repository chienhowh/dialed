import { formatAmount, formatSeconds } from "@/features/brew-plan/display";

import type { GuidedBrewPlanSnapshot, GuidedBrewPlanStep } from "./types";

export class InvalidGuidedBrewPlanError extends Error {
  constructor() {
    super("Guided Brew requires a complete, ordered Brew Plan step snapshot.");
    this.name = "InvalidGuidedBrewPlanError";
  }
}

export type GuidedBrewStepPresentation = {
  actionLabel: "Finish Brew" | "Next";
  instruction: string;
  isFinalStep: boolean;
  nextStepPreview: string;
  stepNumber: number;
  stepTypeLabel: "Pour" | "Wait";
  targetLabel: "Duration" | "Target water";
  targetValue: string;
  totalStepCount: number;
};

function isValidPlanStep(value: unknown, index: number, previousStartTime: number) {
  if (!value || typeof value !== "object") return false;
  const step = value as Partial<GuidedBrewPlanStep>;
  if (
    typeof step.id !== "string"
    || step.id.trim().length === 0
    || step.stepOrder !== index + 1
    || !Number.isInteger(step.startTime)
    || (step.startTime ?? -1) < 0
    || (index > 0 && (step.startTime ?? -1) < previousStartTime)
    || (step.duration !== null && (!Number.isInteger(step.duration) || (step.duration ?? -1) < 0))
    || (step.note !== null && typeof step.note !== "string")
  ) return false;

  if (step.stepType === "pour") {
    return typeof step.targetWater === "number"
      && Number.isFinite(step.targetWater)
      && step.targetWater > 0;
  }
  return step.stepType === "wait" && step.targetWater === null;
}

export function isGuidedBrewPlanSnapshot(value: unknown): value is GuidedBrewPlanSnapshot {
  if (!value || typeof value !== "object") return false;
  const plan = value as Partial<GuidedBrewPlanSnapshot>;
  if (
    typeof plan.brewPlanId !== "string"
    || plan.brewPlanId.trim().length === 0
    || typeof plan.coffeeName !== "string"
    || plan.coffeeName.trim().length === 0
    || typeof plan.grindLevel !== "string"
    || plan.grindLevel.trim().length === 0
    || typeof plan.recipeName !== "string"
    || plan.recipeName.trim().length === 0
    || typeof plan.tasteGoal !== "string"
    || plan.tasteGoal.trim().length === 0
    || !Number.isFinite(plan.coffeeDose)
    || (plan.coffeeDose ?? 0) <= 0
    || !Number.isFinite(plan.ratio)
    || (plan.ratio ?? 0) <= 0
    || !Number.isFinite(plan.waterAmount)
    || (plan.waterAmount ?? 0) <= 0
    || !Number.isInteger(plan.waterTemperature)
    || (plan.waterTemperature ?? 0) < 1
    || (plan.waterTemperature ?? 0) > 100
    || !Number.isInteger(plan.targetBrewTimeMin)
    || (plan.targetBrewTimeMin ?? -1) < 0
    || !Number.isInteger(plan.targetBrewTimeMax)
    || (plan.targetBrewTimeMax ?? -1) < (plan.targetBrewTimeMin ?? 0)
    || !Array.isArray(plan.steps)
    || plan.steps.length === 0
  ) return false;

  const stepIds = new Set<string>();
  return plan.steps.every((step, index) => {
    if (!isValidPlanStep(step, index, plan.steps?.[index - 1]?.startTime ?? 0)) return false;
    if (stepIds.has(step.id)) return false;
    stepIds.add(step.id);
    return true;
  });
}

export function assertGuidedBrewPlanSnapshot(value: unknown): asserts value is GuidedBrewPlanSnapshot {
  if (!isGuidedBrewPlanSnapshot(value)) throw new InvalidGuidedBrewPlanError();
}

function instructionForStep(step: GuidedBrewPlanStep) {
  const note = step.note?.trim();
  return note || (step.stepType === "pour" ? "Pour" : "Wait");
}

function nextPreview(step: GuidedBrewPlanStep) {
  const timing = formatSeconds(step.startTime);
  if (step.stepType === "pour") {
    return `${timing} · Pour to ${formatAmount(step.targetWater ?? 0)}g`;
  }
  return `${timing} · ${instructionForStep(step)}${step.duration === null ? "" : ` for ${formatSeconds(step.duration)}`}`;
}

export function getGuidedBrewStepPresentation(
  plan: GuidedBrewPlanSnapshot,
  currentStepIndex: number,
): GuidedBrewStepPresentation {
  assertGuidedBrewPlanSnapshot(plan);
  if (!Number.isInteger(currentStepIndex) || currentStepIndex < 0 || currentStepIndex >= plan.steps.length) {
    throw new InvalidGuidedBrewPlanError();
  }

  const step = plan.steps[currentStepIndex];
  if (!step) throw new InvalidGuidedBrewPlanError();
  const isFinalStep = currentStepIndex === plan.steps.length - 1;
  const followingStep = plan.steps[currentStepIndex + 1];

  return {
    actionLabel: isFinalStep ? "Finish Brew" : "Next",
    instruction: instructionForStep(step),
    isFinalStep,
    nextStepPreview: followingStep ? nextPreview(followingStep) : "Finish brew",
    stepNumber: currentStepIndex + 1,
    stepTypeLabel: step.stepType === "pour" ? "Pour" : "Wait",
    targetLabel: step.stepType === "pour" ? "Target water" : "Duration",
    targetValue: step.stepType === "pour"
      ? `${formatAmount(step.targetWater ?? 0)}g`
      : step.duration === null ? "Until ready" : formatSeconds(step.duration),
    totalStepCount: plan.steps.length,
  };
}
