import type { BrewPlan, BrewPlanEditInput, BrewPlanStep } from "./types";
import { validateBrewPlanEditStructure } from "./validation";

export type BrewPlanEditFormState = {
  errors?: Record<string, string>;
  message?: string;
};

export const initialBrewPlanEditFormState: BrewPlanEditFormState = {};

function readValue(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function parseNumber(
  formData: FormData,
  field: string,
  label: string,
  errors: Record<string, string>,
  options: { integer?: boolean; max: number; min: number },
) {
  const raw = readValue(formData, field);
  const value = Number(raw);

  if (!raw || !Number.isFinite(value) || value < options.min || value > options.max || (options.integer && !Number.isInteger(value))) {
    errors[field] = `${label} must be between ${options.min} and ${options.max}${options.integer ? " seconds" : ""}.`;
    return null;
  }

  return value;
}

function parseOptionalNumber(
  formData: FormData,
  field: string,
  label: string,
  errors: Record<string, string>,
  options: { max: number; min: number },
) {
  const raw = readValue(formData, field);
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < options.min || value > options.max) {
    errors[field] = `${label} must be between ${options.min} and ${options.max}.`;
    return null;
  }
  return value;
}

function parseStep(formData: FormData, step: BrewPlanStep, errors: Record<string, string>) {
  const prefix = `step.${step.id}`;
  const startTime = parseNumber(formData, `${prefix}.startTime`, "Start time", errors, {
    integer: true,
    max: 3600,
    min: 0,
  });
  const duration = parseOptionalNumber(formData, `${prefix}.duration`, "Duration", errors, {
    max: 3600,
    min: 0,
  });
  const targetWater = parseOptionalNumber(formData, `${prefix}.targetWater`, "Target water", errors, {
    max: 2000,
    min: 0.1,
  });

  if (step.stepType === "pour" && targetWater === null && !errors[`${prefix}.targetWater`]) {
    errors[`${prefix}.targetWater`] = "Pour steps require a target water amount.";
  }

  return startTime === null ? null : {
    duration,
    id: step.id,
    startTime,
    targetWater,
  };
}

export function parseBrewPlanEditFormData(formData: FormData, plan: BrewPlan):
  | { data: BrewPlanEditInput; success: true }
  | { errors: Record<string, string>; success: false } {
  const errors: Record<string, string> = {};
  const coffeeDose = parseNumber(formData, "coffeeDose", "Coffee dose", errors, { max: 100, min: 1 });
  const waterAmount = parseNumber(formData, "waterAmount", "Water", errors, { max: 2000, min: 1 });
  const ratio = parseNumber(formData, "ratio", "Ratio", errors, { max: 100, min: 1 });
  const waterTemperature = parseNumber(formData, "waterTemperature", "Temperature", errors, {
    integer: true,
    max: 100,
    min: 1,
  });
  const targetBrewTimeMin = parseNumber(formData, "targetBrewTimeMin", "Earliest finish", errors, {
    integer: true,
    max: 3600,
    min: 0,
  });
  const targetBrewTimeMax = parseNumber(formData, "targetBrewTimeMax", "Latest finish", errors, {
    integer: true,
    max: 3600,
    min: 0,
  });
  const grindLevel = readValue(formData, "grindLevel");
  if (!grindLevel || grindLevel.length > 80) errors.grindLevel = "Enter a grind level using 80 characters or fewer.";
  const steps = plan.steps.map((step) => parseStep(formData, step, errors));

  if (
    targetBrewTimeMin !== null
    && targetBrewTimeMax !== null
    && targetBrewTimeMax < targetBrewTimeMin
  ) {
    errors.targetBrewTimeMax = "Latest finish must be at or after earliest finish.";
  }

  if (
    Object.keys(errors).length > 0
    || coffeeDose === null
    || waterAmount === null
    || ratio === null
    || waterTemperature === null
    || targetBrewTimeMin === null
    || targetBrewTimeMax === null
    || !grindLevel
    || steps.some((step) => step === null)
  ) {
    return { errors, success: false };
  }

  const data: BrewPlanEditInput = {
    coffeeDose,
    grindLevel,
    ratio,
    steps: steps as BrewPlanEditInput["steps"],
    targetBrewTimeMax,
    targetBrewTimeMin,
    waterAmount,
    waterTemperature,
  };
  const structuralErrors = validateBrewPlanEditStructure(plan, data);
  if (Object.keys(structuralErrors).length > 0) return { errors: structuralErrors, success: false };

  return { data, success: true };
}
