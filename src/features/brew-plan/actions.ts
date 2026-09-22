"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { requireUser } from "@/features/auth/require-user";
import { getCoffee } from "@/features/coffee/repository";

import { parseBrewPlanEditFormData, type BrewPlanEditFormState } from "./edit-form";
import {
  BrewPlanAlreadyStartedError,
  BrewPlanNotFoundError,
  InvalidBrewPlanEditError,
  createRecommendedBrewPlan,
  getBrewPlan,
  updateBrewPlan,
} from "./repository";
import {
  parseTasteGoalFormData,
  type TasteGoalFormState,
} from "./taste-goal-form";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function createRecommendedBrewPlanAction(
  coffeeId: string,
  _previousState: TasteGoalFormState,
  formData: FormData,
): Promise<TasteGoalFormState> {
  if (!isUuid(coffeeId)) notFound();

  const parsed = parseTasteGoalFormData(formData);
  if (!parsed.success) {
    return { errors: parsed.errors, message: "Check your taste goals.", values: parsed.values };
  }

  const { supabase, user } = await requireUser();
  const coffee = await getCoffee(supabase, user.id, coffeeId);
  if (!coffee || coffee.status !== "active") notFound();

  let brewPlanId: string;
  try {
    brewPlanId = await createRecommendedBrewPlan(supabase, user.id, coffee, parsed.data);
  } catch {
    return { message: "We could not create a Brew Plan. Please try again." };
  }

  revalidatePath(`/coffee/${coffeeId}`);
  redirect(`/brew/${brewPlanId}`);
}

export async function updateBrewPlanAction(
  brewPlanId: string,
  _previousState: BrewPlanEditFormState,
  formData: FormData,
): Promise<BrewPlanEditFormState> {
  if (!isUuid(brewPlanId)) notFound();

  const { supabase, user } = await requireUser();
  const plan = await getBrewPlan(supabase, user.id, brewPlanId);
  if (!plan) notFound();

  const parsed = parseBrewPlanEditFormData(formData, plan);
  if (!parsed.success) return { errors: parsed.errors, message: "Check the highlighted fields." };

  try {
    await updateBrewPlan(supabase, user.id, brewPlanId, parsed.data);
  } catch (error) {
    if (error instanceof BrewPlanNotFoundError) notFound();
    if (error instanceof BrewPlanAlreadyStartedError) {
      return { message: "This Brew Plan is locked because brewing has already started." };
    }
    if (error instanceof InvalidBrewPlanEditError) {
      return { message: "This Brew Plan is inconsistent. Review its amounts, timing, and cumulative pours." };
    }
    return { message: "We could not update this Brew Plan. Please try again." };
  }

  revalidatePath(`/brew/${brewPlanId}`);
  redirect(`/brew/${brewPlanId}`);
}
