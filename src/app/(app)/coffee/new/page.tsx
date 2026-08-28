import type { Metadata } from "next";
import Link from "next/link";

import { CoffeeForm } from "@/components/coffee/coffee-form";
import { createCoffeeAction } from "@/features/coffee/actions";
import { emptyCoffeeFormValues } from "@/features/coffee/coffee-form";

export const metadata: Metadata = { title: "Add Coffee" };

export default function AddCoffeePage() {
  return (
    <section aria-labelledby="add-coffee-heading" className="mx-auto max-w-lg">
      <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--muted)]" href="/coffee">← My Coffee</Link>
      <h1 id="add-coffee-heading" className="mt-4 text-3xl font-semibold tracking-tight">Add Coffee</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Start with what you know. Region and all extra details are optional.</p>
      <CoffeeForm action={createCoffeeAction} cancelHref="/coffee" defaultValues={emptyCoffeeFormValues} submitLabel="Save Coffee" />
    </section>
  );
}
