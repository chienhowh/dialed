import { describe, expect, it } from "vitest";

import { getBeanProfileSummary, getCoffeeDisplayName, getOriginSummary } from "./coffee-display";
import type { Coffee } from "./types";

const coffee: Coffee = {
  beanProfile: {
    farm: null,
    id: "bean-profile-id",
    originCountry: "ET",
    process: "washed",
    producer: null,
    region: "Sidama",
    roastLevel: "light",
    variety: "74158",
  },
  beanProfileId: "bean-profile-id",
  id: "coffee-id",
  notes: null,
  productName: null,
  purchaseDate: null,
  purchasePlace: null,
  roastDate: null,
  roaster: "Simple Kaffa",
  status: "active",
};

describe("coffee display helpers", () => {
  it("falls back to origin and region when the coffee has no product name", () => {
    expect(getCoffeeDisplayName(coffee)).toBe("Ethiopia Sidama");
  });

  it("uses the product name when available", () => {
    expect(getCoffeeDisplayName({ ...coffee, productName: "Hamasho" })).toBe("Hamasho");
  });

  it("builds concise bean and origin summaries", () => {
    expect(getBeanProfileSummary(coffee)).toBe("Washed · 74158 · Light");
    expect(getOriginSummary(coffee)).toBe("Ethiopia · Sidama");
  });
});
