import Link from "next/link";
import { redirect } from "next/navigation";

import { PrimaryNavigation } from "@/components/navigation/primary-navigation";
import { ActiveBrewRecovery } from "@/components/brew/active-brew-recovery";
import { signOut } from "@/app/(auth)/login/actions";
import { createClient } from "@/lib/supabase/server";

export async function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col bg-[var(--background)] shadow-[0_0_40px_rgba(38,27,21,0.06)]">
      <header className="flex min-h-16 items-center justify-between border-b border-[var(--border)] px-5">
        <Link className="text-lg font-semibold tracking-tight" href="/">
          Dialed
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden max-w-36 truncate text-xs text-[var(--muted)] sm:inline">{user.email}</span>
          <form action={signOut}>
            <button className="min-h-11 px-2 py-3 text-sm font-medium text-[var(--muted)]" type="submit">
              Sign out
            </button>
          </form>
          <Link className="min-h-11 px-2 py-3 text-sm font-medium text-[var(--muted)]" href="/settings">
            Settings
          </Link>
        </div>
      </header>
      <ActiveBrewRecovery ownerUserId={user.id} />
      <main className="flex-1 px-5 py-8">{children}</main>
      <div className="sticky bottom-0 z-10">
        <PrimaryNavigation />
      </div>
    </div>
  );
}
