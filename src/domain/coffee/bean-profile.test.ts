import { describe, expect, it } from "vitest";

import {
  getOriginLabel,
  getProcessLabel,
  getRoastLevelLabel,
  isOriginCode,
  isProcessCode,
  isRoastLevelCode,
  ORIGIN_CODES,
  PROCESS_CATALOG,
  ROAST_LEVEL_CATALOG,
} from "./bean-profile";

describe("bean profile canonical catalogs", () => {
  it("contains a unique ISO 3166-1 alpha-2 origin catalog", () => {
    expect(ORIGIN_CODES).toHaveLength(249);
    expect(new Set(ORIGIN_CODES).size).toBe(ORIGIN_CODES.length);
    expect(ORIGIN_CODES.every((code) => /^[A-Z]{2}$/.test(code))).toBe(true);
  });

  it("maps representative origin codes to human-readable labels", () => {
    expect(getOriginLabel("ET")).toBe("Ethiopia");
    expect(getOriginLabel("KE")).toBe("Kenya");
    expect(getOriginLabel("CO")).toBe("Colombia");
    expect(getOriginLabel("PA")).toBe("Panama");
    expect(getOriginLabel("TW")).toBe("Taiwan");
  });

  it("accepts only canonical origin codes", () => {
    expect(isOriginCode("ET")).toBe(true);
    expect(isOriginCode("Ethiopia")).toBe(false);
    expect(isOriginCode("et")).toBe(false);
    expect(isOriginCode("ZZ")).toBe(false);
  });

  it("keeps process stored values separate from labels", () => {
    expect(PROCESS_CATALOG.map(({ value }) => value)).toEqual([
      "washed",
      "natural",
      "honey",
      "other",
    ]);
    expect(getProcessLabel("washed")).toBe("Washed");
    expect(isProcessCode("Washed")).toBe(false);
    expect(isProcessCode("anaerobic")).toBe(false);
  });

  it("keeps roast stored values separate from labels", () => {
    expect(ROAST_LEVEL_CATALOG.map(({ value }) => value)).toEqual([
      "light",
      "medium_light",
      "medium",
      "medium_dark",
      "dark",
    ]);
    expect(getRoastLevelLabel("medium_light")).toBe("Medium Light");
    expect(isRoastLevelCode("Medium Light")).toBe(false);
  });
});
