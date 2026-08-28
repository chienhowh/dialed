import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CoffeeForm } from "@/components/coffee/coffee-form";
import { requireUser } from "@/features/auth/require-user";
import { updateCoffeeAction } from "@/features/coffee/actions";
import { coffeeToFormValues } from "@/features/coffee/coffee-form";
import { getCoffee } from "@/features/coffee/repository";

export const metadata: Metadata = { title: "Edit Coffee" };

type EditCoffeePageProps = { params: Promise<{ coffeeId: string }> };

export default async function EditCoffeePage({ params }: EditCoffeePageProps) {
  const { coffeeId } = await params;
  const { supabase, user } = await requireUser();
  const coffee = await getCoffee(supabase, user.id, coffeeId);

  if (!coffee) notFound();

  return (
    <section aria-labelledby="edit-coffee-heading" className="mx-auto max-w-lg">
      <h1 id="edit-coffee-heading" className="text-3xl font-semibold tracking-tight">Edit Coffee</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Update the bean profile or details for this bag.</p>
      <CoffeeForm
        action={updateCoffeeAction.bind(null, coffee.id)}
        cancelHref={`/coffee/${coffee.id}`}
        defaultValues={coffeeToFormValues(coffee)}
        submitLabel="Save Changes"
      />
    </section>
  );
}
