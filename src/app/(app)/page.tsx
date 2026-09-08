import Link from "next/link";

import { CoffeeCard } from "@/components/coffee/coffee-card";
import { HomeDialInShortcutCard } from "@/components/dial-in/home-dial-in-shortcut";
import { requireUser } from "@/features/auth/require-user";
import { listCoffees } from "@/features/coffee/repository";
import { getHomeDialInShortcuts } from "@/features/dial-in-history/model";
import { listDialInThreadSummaries } from "@/features/dial-in-history/repository";

export default async function HomePage() {
  const { supabase, user } = await requireUser();
  const [coffees, dialInThreads] = await Promise.all([
    listCoffees(supabase, user.id, "active"),
    listDialInThreadSummaries(supabase, user.id),
  ]);
  const recoveryShortcuts = getHomeDialInShortcuts(dialInThreads);

  return (
    <section aria-labelledby="home-heading" className="mx-auto max-w-lg">
      <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">Home</p>
      <h1 id="home-heading" className="mt-3 text-3xl font-semibold tracking-tight">
        What are you brewing today?
      </h1>

      {coffees.length > 0 ? (
        <div className="mt-9">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">My Coffee</h2>
            <Link className="text-sm font-semibold text-[var(--accent)]" href="/coffee">View all</Link>
          </div>
          <div className="mt-4 space-y-4">
            {coffees.map((coffee) => <CoffeeCard coffee={coffee} key={coffee.id} showBrewAction />)}
          </div>
        </div>
      ) : (
        <div className="mt-16 rounded-2xl border border-dashed border-[var(--border)] px-6 py-12 text-center">
          <h2 className="text-xl font-semibold">Add your first coffee</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--muted)]">
            Save the coffee you have on hand so you can find a starting brew plan later.
          </p>
          <Link className="mt-7 inline-flex min-h-12 items-center rounded-xl bg-[var(--accent)] px-5 font-semibold text-white" href="/coffee/new">
            + Add Coffee
          </Link>
        </div>
      )}

      {recoveryShortcuts.length > 0 ? (
        <section aria-labelledby="continue-dial-in-heading" className="mt-10 border-t border-[var(--border)] pt-8">
          <h2 id="continue-dial-in-heading" className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">
            Continue Dial-in
          </h2>
          <div className="mt-4 space-y-4">
            {recoveryShortcuts.map((shortcut) => (
              <HomeDialInShortcutCard key={shortcut.threadId} shortcut={shortcut} />
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
