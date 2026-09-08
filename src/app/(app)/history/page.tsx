import type { Metadata } from "next";
import Link from "next/link";

import { HistoryTimeline } from "@/components/history/history-timeline";
import { requireUser } from "@/features/auth/require-user";
import { buildHistoryCoffeeGroups } from "@/features/dial-in-history/history";
import {
  listDialInThreadSummaries,
  listDialInThreadSummariesForCoffee,
} from "@/features/dial-in-history/repository";

export const metadata: Metadata = {
  title: "History",
};

type HistoryPageProps = {
  searchParams: Promise<{ coffee?: string | string[] }>;
};

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const { coffee } = await searchParams;
  const coffeeId = typeof coffee === "string" && coffee.trim() ? coffee : null;
  const { supabase, user } = await requireUser();
  const summaries = coffeeId
    ? await listDialInThreadSummariesForCoffee(supabase, user.id, coffeeId)
    : await listDialInThreadSummaries(supabase, user.id);
  const groups = buildHistoryCoffeeGroups(summaries);

  return (
    <section aria-labelledby="history-heading" className="mx-auto max-w-4xl">
      <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">
        History
      </p>
      <h1 id="history-heading" className="mt-3 text-3xl font-semibold tracking-tight">
        Brew History
      </h1>
      <p className="mt-4 text-base leading-7 text-[var(--muted)]">
        Review each Dial-in Thread, recover unfinished work, or brew an earlier Plan again.
      </p>
      {coffeeId ? <Link className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--accent)]" href="/history">View all coffee</Link> : null}
      {groups.length > 0 ? (
        <HistoryTimeline groups={groups} />
      ) : (
        <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <p className="font-semibold">No brews yet.</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Start with a coffee and a taste goal to create your first Brew Plan.</p>
          <Link className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-[var(--accent)] px-5 font-semibold text-white" href="/coffee">
            My Coffee
          </Link>
        </div>
      )}
    </section>
  );
}
