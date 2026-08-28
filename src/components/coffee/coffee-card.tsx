import Link from "next/link";

import { getBeanProfileSummary, getCoffeeDisplayName } from "@/features/coffee/coffee-display";
import type { Coffee } from "@/features/coffee/types";

type CoffeeCardProps = {
  coffee: Coffee;
  showBrewAction?: boolean;
};

export function CoffeeCard({ coffee, showBrewAction = false }: CoffeeCardProps) {
  const displayName = getCoffeeDisplayName(coffee);

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold"><Link href={`/coffee/${coffee.id}`}>{displayName}</Link></h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{getBeanProfileSummary(coffee)}</p>
          {coffee.roaster ? <p className="mt-2 text-sm">{coffee.roaster}</p> : null}
        </div>
        <Link aria-label={`View ${displayName}`} className="min-h-11 shrink-0 px-2 py-2 text-xl text-[var(--muted)]" href={`/coffee/${coffee.id}`}>→</Link>
      </div>
      {showBrewAction ? (
        <Link className="mt-5 flex min-h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white" href={`/coffee/${coffee.id}/brew`}>
          Brew
        </Link>
      ) : null}
    </article>
  );
}
