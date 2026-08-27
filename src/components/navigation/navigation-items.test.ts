import { describe, expect, it } from "vitest";

import { navigationItems } from "./navigation-items";

describe("navigationItems", () => {
  it("matches the documented MVP bottom navigation", () => {
    expect(navigationItems).toEqual([
      { href: "/", label: "Home" },
      { href: "/coffee", label: "Coffee" },
      { href: "/history", label: "History" },
    ]);
  });

  it("does not treat brewing as a navigation destination", () => {
    const hrefs: readonly string[] = navigationItems.map(({ href }) => href);

    expect(hrefs).not.toContain("/brew");
  });
});
