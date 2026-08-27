"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navigationItems } from "./navigation-items";

function isCurrentRoute(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

export function PrimaryNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="border-t border-[var(--border)] bg-[var(--surface)]">
      <ul className="mx-auto grid max-w-xl grid-cols-3 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {navigationItems.map(({ href, label }) => {
          const isCurrent = isCurrentRoute(pathname, href);

          return (
            <li key={href}>
              <Link
                aria-current={isCurrent ? "page" : undefined}
                className={`block min-h-12 px-3 py-3 text-center text-sm font-medium transition-colors ${
                  isCurrent ? "text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
                href={href}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
