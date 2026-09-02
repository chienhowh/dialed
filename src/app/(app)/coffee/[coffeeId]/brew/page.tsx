import Link from "next/link";
import { notFound } from "next/navigation";

import { TasteGoalForm } from "@/components/brew/taste-goal-form";
import { requireUser } from "@/features/auth/require-user";
import { createRecommendedBrewPlanAction } from "@/features/brew-plan/actions";
import { getCoffeeDisplayName } from "@/features/coffee/coffee-display";
import { getCoffee } from "@/features/coffee/repository";

type BrewPlaceholderPageProps = { params: Promise<{ coffeeId: string }> };

export default async function TasteGoalPage({ params }: BrewPlaceholderPageProps) {
  const { coffeeId } = await params;
  const { supabase, user } = await requireUser();
  const coffee = await getCoffee(supabase, user.id, coffeeId);

  if (!coffee || coffee.status !== "active") notFound();

  const action = createRecommendedBrewPlanAction.bind(null, coffee.id);

  return (
    <section aria-labelledby="taste-goal-heading" className="mx-auto max-w-lg">
      <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--muted)]" href={`/coffee/${coffee.id}`}>
        ← {getCoffeeDisplayName(coffee)}
      </Link>
      <p className="mt-5 text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">Taste Goal</p>
      <h1 id="taste-goal-heading" className="mt-2 text-3xl font-semibold tracking-tight">How do you want it today?</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Choose a direction for this brew. It won’t change your Coffee profile.</p>
      <TasteGoalForm action={action} cancelHref={`/coffee/${coffee.id}`} />
    </section>
  );
}
