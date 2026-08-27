import { describe, expect, it } from "vitest";

import { getAppUrl } from "./env";

describe("getAppUrl", () => {
  it("uses the local application URL when no value is configured", () => {
    expect(getAppUrl(undefined).toString()).toBe("http://localhost:3000/");
  });

  it("accepts a deployed absolute URL", () => {
    expect(getAppUrl("https://dialed.example").toString()).toBe("https://dialed.example/");
  });

  it("rejects a relative URL", () => {
    expect(() => getAppUrl("/dialed")).toThrow("APP_URL must be a valid absolute URL.");
  });
});
