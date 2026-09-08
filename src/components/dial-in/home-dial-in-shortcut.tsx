import Link from "next/link";

import type { HomeDialInShortcut } from "@/features/dial-in-history/types";

export function HomeDialInShortcutCard({ shortcut }: { shortcut: HomeDialInShortcut }) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <h3 className="text-lg font-semibold">
        <Link href={`/coffee/${shortcut.coffeeId}`}>{shortcut.coffeeName}</Link>
      </h3>
      <p className="mt-1 text-sm text-[var(--muted)]">{shortcut.tasteGoalLabel}</p>
      <p className="mt-4 text-sm">{shortcut.action.label}</p>
      <Link
        className="mt-3 flex min-h-11 items-center justify-center rounded-xl border border-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent)]"
        href={shortcut.action.href}
      >
        {shortcut.action.ctaLabel}
      </Link>
      {shortcut.additionalActionCount > 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">
          {shortcut.additionalActionCount} more {shortcut.additionalActionCount === 1 ? "item needs" : "items need"} attention.{" "}
          <Link className="font-semibold text-[var(--accent)]" href={`/coffee/${shortcut.coffeeId}`}>
            View all
          </Link>
        </p>
      ) : null}
    </article>
  );
}
