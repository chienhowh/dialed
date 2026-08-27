import Link from "next/link";

import { PrimaryNavigation } from "@/components/navigation/primary-navigation";

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col bg-[var(--background)] shadow-[0_0_40px_rgba(38,27,21,0.06)]">
      <header className="flex min-h-16 items-center justify-between border-b border-[var(--border)] px-5">
        <Link className="text-lg font-semibold tracking-tight" href="/">
          Dialed
        </Link>
        <Link className="min-h-11 px-2 py-3 text-sm font-medium text-[var(--muted)]" href="/settings">
          Settings
        </Link>
      </header>
      <main className="flex-1 px-5 py-8">{children}</main>
      <div className="sticky bottom-0 z-10">
        <PrimaryNavigation />
      </div>
    </div>
  );
}
