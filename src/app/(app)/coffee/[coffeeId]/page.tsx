import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getOriginLabel,
  getProcessLabel,
  getRoastLevelLabel,
} from "@/domain/coffee/bean-profile";
import { DialInThreadCard } from "@/components/dial-in/dial-in-thread-card";
import { requireUser } from "@/features/auth/require-user";
import { archiveCoffeeAction } from "@/features/coffee/actions";
import { getBeanProfileSummary, getCoffeeDisplayName, getOriginSummary } from "@/features/coffee/coffee-display";
import { getCoffee } from "@/features/coffee/repository";
import { listDialInThreadSummariesForCoffee } from "@/features/dial-in-history/repository";

type CoffeeDetailPageProps = { params: Promise<{ coffeeId: string }> };

function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;

  return (
    <div className="grid grid-cols-[7rem_1fr] gap-4 py-3 text-sm">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

export default async function CoffeeDetailPage({ params }: CoffeeDetailPageProps) {
  const { coffeeId } = await params;
  const { supabase, user } = await requireUser();
  const [coffee, dialInThreads] = await Promise.all([
    getCoffee(supabase, user.id, coffeeId),
    listDialInThreadSummariesForCoffee(supabase, user.id, coffeeId),
  ]);

  if (!coffee) notFound();

  const archiveAction = archiveCoffeeAction.bind(null, coffee.id);

  return (
    <section aria-labelledby="coffee-detail-heading" className="mx-auto max-w-lg">
      <div className="flex items-center justify-between gap-4">
        <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--muted)]" href="/coffee">← My Coffee</Link>
        <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--accent)]" href={`/coffee/${coffee.id}/edit`}>Edit</Link>
      </div>

      <div className="mt-5">
        <div className="flex items-center gap-3">
          <h1 id="coffee-detail-heading" className="text-3xl font-semibold tracking-tight">{getCoffeeDisplayName(coffee)}</h1>
          {coffee.status === "archived" ? <span className="rounded-full bg-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">Archived</span> : null}
        </div>
        <p className="mt-3 text-base text-[var(--muted)]">{getBeanProfileSummary(coffee)}</p>
        {coffee.productName ? <p className="mt-2 text-sm text-[var(--muted)]">{getOriginSummary(coffee)}</p> : null}
        {coffee.roaster ? <p className="mt-2 font-medium">{coffee.roaster}</p> : null}
      </div>

      {coffee.status === "active" ? (
        <Link className="mt-8 flex min-h-12 items-center justify-center rounded-xl bg-[var(--accent)] px-5 font-semibold text-white" href={`/coffee/${coffee.id}/brew`}>
          Brew This Coffee
        </Link>
      ) : null}

      <section aria-labelledby="current-dial-ins-heading" className="mt-10 border-t border-[var(--border)] pt-8">
        <div className="flex items-center justify-between gap-4">
          <h2 id="current-dial-ins-heading" className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">
            Current Dial-ins
          </h2>
          <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--accent)]" href={`/history?coffee=${coffee.id}`}>Brew History →</Link>
        </div>
        {dialInThreads.length > 0 ? (
          <div className="mt-4 space-y-4">
            {dialInThreads.map((thread) => <DialInThreadCard key={thread.threadId} thread={thread} />)}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">No dial-ins yet.</p>
        )}
      </section>

      <section aria-labelledby="bean-profile-heading" className="mt-10 border-t border-[var(--border)] pt-8">
        <h2 id="bean-profile-heading" className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">Bean Profile</h2>
        <dl className="mt-3 divide-y divide-[var(--border)]">
          <DetailRow label="Origin" value={getOriginLabel(coffee.beanProfile.originCountry)} />
          <DetailRow label="Region" value={coffee.beanProfile.region} />
          <DetailRow label="Process" value={getProcessLabel(coffee.beanProfile.process)} />
          <DetailRow label="Roast level" value={getRoastLevelLabel(coffee.beanProfile.roastLevel)} />
          <DetailRow label="Variety" value={coffee.beanProfile.variety} />
          <DetailRow label="Producer" value={coffee.beanProfile.producer} />
          <DetailRow label="Farm" value={coffee.beanProfile.farm} />
        </dl>
      </section>

      <section aria-labelledby="coffee-metadata-heading" className="mt-10 border-t border-[var(--border)] pt-8">
        <h2 id="coffee-metadata-heading" className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">My Coffee</h2>
        <dl className="mt-3 divide-y divide-[var(--border)]">
          <DetailRow label="Coffee name" value={coffee.productName} />
          <DetailRow label="Roaster" value={coffee.roaster} />
          <DetailRow label="Roast date" value={coffee.roastDate} />
          <DetailRow label="Purchase date" value={coffee.purchaseDate} />
          <DetailRow label="Purchased at" value={coffee.purchasePlace} />
          <DetailRow label="Notes" value={coffee.notes} />
        </dl>
      </section>

      {coffee.status === "active" ? (
        <form action={archiveAction} className="mt-10 border-t border-[var(--border)] pt-8">
          <button className="min-h-12 w-full rounded-xl border border-red-300 bg-red-50 px-5 font-semibold text-red-800" type="submit">Archive Coffee</button>
          <p className="mt-3 text-center text-xs leading-5 text-[var(--muted)]">This keeps the coffee and its history.</p>
        </form>
      ) : null}
    </section>
  );
}
