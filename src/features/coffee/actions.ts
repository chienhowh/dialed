"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { requireUser } from "@/features/auth/require-user";

import { parseCoffeeFormData, type CoffeeFormState } from "./coffee-form";
import { archiveCoffee, CoffeeNotFoundError, createCoffee, updateCoffee } from "./repository";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function revalidateCoffeePaths(coffeeId: string) {
  revalidatePath("/");
  revalidatePath("/coffee");
  revalidatePath(`/coffee/${coffeeId}`);
}

export async function createCoffeeAction(
  _previousState: CoffeeFormState,
  formData: FormData,
): Promise<CoffeeFormState> {
  const parsed = parseCoffeeFormData(formData);

  if (!parsed.success) {
    return { errors: parsed.errors, message: "Check the highlighted fields." };
  }

  const { supabase, user } = await requireUser();
  let coffeeId: string;

  try {
    coffeeId = await createCoffee(supabase, user.id, parsed.data);
  } catch {
    return { message: "We could not save this coffee. Please try again." };
  }

  revalidateCoffeePaths(coffeeId);
  redirect(`/coffee/${coffeeId}`);
}

export async function updateCoffeeAction(
  coffeeId: string,
  _previousState: CoffeeFormState,
  formData: FormData,
): Promise<CoffeeFormState> {
  if (!isUuid(coffeeId)) {
    notFound();
  }

  const parsed = parseCoffeeFormData(formData);

  if (!parsed.success) {
    return { errors: parsed.errors, message: "Check the highlighted fields." };
  }

  const { supabase, user } = await requireUser();

  try {
    await updateCoffee(supabase, user.id, coffeeId, parsed.data);
  } catch (error) {
    if (error instanceof CoffeeNotFoundError) {
      notFound();
    }

    return { message: "We could not update this coffee. Please try again." };
  }

  revalidateCoffeePaths(coffeeId);
  redirect(`/coffee/${coffeeId}`);
}

export async function archiveCoffeeAction(coffeeId: string) {
  if (!isUuid(coffeeId)) {
    notFound();
  }

  const { supabase, user } = await requireUser();

  try {
    await archiveCoffee(supabase, user.id, coffeeId);
  } catch (error) {
    if (error instanceof CoffeeNotFoundError) {
      notFound();
    }

    throw error;
  }

  revalidateCoffeePaths(coffeeId);
  redirect("/coffee");
}
