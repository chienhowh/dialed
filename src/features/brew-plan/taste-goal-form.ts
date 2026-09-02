import { isTasteGoal, type TasteGoal } from "@/domain/taste/taste-goal";

export type TasteGoalInput = {
  primaryTasteGoal: TasteGoal;
  secondaryTasteGoal: TasteGoal | null;
};

export type TasteGoalFormState = {
  errors?: {
    primaryTasteGoal?: string;
    secondaryTasteGoal?: string;
  };
  message?: string;
  values?: {
    primaryTasteGoal: string;
    secondaryTasteGoal: string;
  };
};

export const initialTasteGoalFormState: TasteGoalFormState = {};

function readFormValue(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

export function parseTasteGoalFormData(formData: FormData):
  | { data: TasteGoalInput; success: true }
  | {
      errors: NonNullable<TasteGoalFormState["errors"]>;
      success: false;
      values: NonNullable<TasteGoalFormState["values"]>;
    } {
  const primaryValue = readFormValue(formData, "primaryTasteGoal");
  const secondaryValue = readFormValue(formData, "secondaryTasteGoal");
  const errors: NonNullable<TasteGoalFormState["errors"]> = {};

  if (!primaryValue) {
    errors.primaryTasteGoal = "Choose a primary taste goal.";
  } else if (!isTasteGoal(primaryValue)) {
    errors.primaryTasteGoal = "Choose a valid primary taste goal.";
  }

  if (secondaryValue && !isTasteGoal(secondaryValue)) {
    errors.secondaryTasteGoal = "Choose a valid secondary taste goal.";
  }

  if (primaryValue && secondaryValue === primaryValue) {
    errors.secondaryTasteGoal = "Secondary goal must be different from the primary goal.";
  }

  if (Object.keys(errors).length > 0 || !isTasteGoal(primaryValue)) {
    return {
      errors,
      success: false,
      values: { primaryTasteGoal: primaryValue, secondaryTasteGoal: secondaryValue },
    };
  }

  return {
    data: {
      primaryTasteGoal: primaryValue,
      secondaryTasteGoal: isTasteGoal(secondaryValue) ? secondaryValue : null,
    },
    success: true,
  };
}
