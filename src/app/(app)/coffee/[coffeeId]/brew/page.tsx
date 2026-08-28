import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "@/features/auth/require-user";
import { getCoffeeDisplayName } from "@/features/coffee/coffee-display";
import { getCoffee } from "@/features/coffee/repository";

type BrewPlaceholderPageProps = { params: Promise<{ coffeeId: string }> };

export default async function BrewPlaceholderPage({ params }: BrewPlaceholderPageProps) {
  const { coffeeId } = await params;
  const { supabase, user } = await requireUser();
  const coffee = await getCoffee(supabase, user.id, coffeeId);

  if (!coffee || coffee.status !== "active") notFound();

  return (
    <section aria-labelledby="brew-placeholder-heading" className="mx-auto max-w-lg py-10 text-center">
      <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">Milestone 4</p>
      <h1 id="brew-placeholder-heading" className="mt-4 text-3xl font-semibold tracking-tight">Brew {getCoffeeDisplayName(coffee)}</h1>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-[var(--muted)]">
        Taste Goal and Brew Plan begin in the next milestone. No brewing data has been created.
      </p>
      <Link className="mt-8 inline-flex min-h-12 items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 font-semibold" href={`/coffee/${coffee.id}`}>Back to Coffee</Link>
    </section>
  );
}
