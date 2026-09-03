import { describe, expect, it } from "vitest";

import { getElapsedMilliseconds, getElapsedSeconds } from "./timer";

describe("timestamp Brew Session timer", () => {
  it("derives deterministic elapsed time from startedAt and now", () => {
    const startedAt = "2026-09-02T01:00:00.000Z";

    expect(getElapsedMilliseconds(startedAt, Date.parse("2026-09-02T01:02:03.987Z"))).toBe(123_987);
    expect(getElapsedSeconds(startedAt, Date.parse("2026-09-02T01:02:03.987Z"))).toBe(123);
  });

  it("clamps clock skew before startedAt to zero", () => {
    expect(getElapsedSeconds("2026-09-02T01:00:01.000Z", Date.parse("2026-09-02T01:00:00.000Z"))).toBe(0);
  });

  it("rejects an invalid persisted start timestamp", () => {
    expect(() => getElapsedSeconds("invalid", 0)).toThrow("start time is invalid");
  });
});
