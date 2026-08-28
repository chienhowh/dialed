import type { Metadata } from "next";
import Link from "next/link";

import { CoffeeCard } from "@/components/coffee/coffee-card";
import { requireUser } from "@/features/auth/require-user";
import { listCoffees } from "@/features/coffee/repository";

export const metadata: Metadata = {
  title: "Coffee",
};

type CoffeePageProps = {
  searchParams: Promise<{ view?: string | string[] }>;
};

export default async function CoffeePage({ searchParams }: CoffeePageProps) {
  const query = await searchParams;
  const status = query.view === "archived" ? "archived" : "active";
  const { supabase, user } = await requireUser();
  const coffees = await listCoffees(supabase, user.id, status);

  return (
    <section aria-labelledby="coffee-heading" className="mx-auto max-w-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">Coffee</p>
          <h1 id="coffee-heading" className="mt-3 text-3xl font-semibold tracking-tight">My Coffee</h1>
        </div>
        <Link aria-label="Add Coffee" className="flex min-h-12 min-w-12 items-center justify-center rounded-xl bg-[var(--accent)] text-2xl text-white" href="/coffee/new">+</Link>
      </div>

      <nav aria-label="Coffee status" className="mt-8 grid grid-cols-2 rounded-xl bg-[var(--surface)] p-1">
        <Link aria-current={status === "active" ? "page" : undefined} className={`rounded-lg px-4 py-3 text-center text-sm font-semibold ${status === "active" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"}`} href="/coffee">Active</Link>
        <Link aria-current={status === "archived" ? "page" : undefined} className={`rounded-lg px-4 py-3 text-center text-sm font-semibold ${status === "archived" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"}`} href="/coffee?view=archived">Archived</Link>
      </nav>

      {coffees.length > 0 ? (
        <div className="mt-6 space-y-4">
          {coffees.map((coffee) => <CoffeeCard coffee={coffee} key={coffee.id} />)}
        </div>
      ) : (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--border)] px-6 py-10 text-center">
          <h2 className="text-lg font-semibold">No {status} coffees</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {status === "active" ? "Add a coffee to start your collection." : "Archived coffees will appear here."}
          </p>
          {status === "active" ? <Link className="mt-6 inline-flex min-h-11 items-center font-semibold text-[var(--accent)]" href="/coffee/new">+ Add Coffee</Link> : null}
        </div>
      )}
    </section>
  );
}
