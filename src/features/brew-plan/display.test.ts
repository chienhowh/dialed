import { describe, expect, it } from "vitest";

import { formatAmount, formatSeconds } from "./display";

describe("brew plan display", () => {
  it("formats elapsed seconds as minutes and seconds", () => {
    expect(formatSeconds(0)).toBe("0:00");
    expect(formatSeconds(135)).toBe("2:15");
  });

  it("does not add unnecessary decimal zeroes", () => {
    expect(formatAmount(15)).toBe("15");
    expect(formatAmount(15.5)).toBe("15.5");
  });
});
