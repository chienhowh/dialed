export const ORIGIN_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ",
  "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ",
  "DE", "DJ", "DK", "DM", "DO", "DZ",
  "EC", "EE", "EG", "EH", "ER", "ES", "ET",
  "FI", "FJ", "FK", "FM", "FO", "FR",
  "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY",
  "HK", "HM", "HN", "HR", "HT", "HU",
  "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT",
  "JE", "JM", "JO", "JP",
  "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ",
  "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY",
  "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ",
  "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ",
  "OM",
  "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY",
  "QA",
  "RE", "RO", "RS", "RU", "RW",
  "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ",
  "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ",
  "UA", "UG", "UM", "US", "UY", "UZ",
  "VA", "VC", "VE", "VG", "VI", "VN", "VU",
  "WF", "WS",
  "YE", "YT",
  "ZA", "ZM", "ZW",
] as const;

export type OriginCode = (typeof ORIGIN_CODES)[number];

export const PROCESS_CATALOG = [
  { label: "Washed", value: "washed" },
  { label: "Natural", value: "natural" },
  { label: "Honey", value: "honey" },
  { label: "Other", value: "other" },
] as const;

export type ProcessCode = (typeof PROCESS_CATALOG)[number]["value"];

export const ROAST_LEVEL_CATALOG = [
  { label: "Light", value: "light" },
  { label: "Medium Light", value: "medium_light" },
  { label: "Medium", value: "medium" },
  { label: "Medium Dark", value: "medium_dark" },
  { label: "Dark", value: "dark" },
] as const;

export type RoastLevelCode = (typeof ROAST_LEVEL_CATALOG)[number]["value"];

const originCodeSet: ReadonlySet<string> = new Set(ORIGIN_CODES);
const processCodeSet: ReadonlySet<string> = new Set(PROCESS_CATALOG.map(({ value }) => value));
const roastLevelCodeSet: ReadonlySet<string> = new Set(ROAST_LEVEL_CATALOG.map(({ value }) => value));
const originDisplayNames = new Intl.DisplayNames(["en"], { type: "region" });

export const ORIGIN_CATALOG: readonly { code: OriginCode; label: string }[] = ORIGIN_CODES.map(
  (code) => ({ code, label: originDisplayNames.of(code) ?? code }),
);

const originLabels = new Map(ORIGIN_CATALOG.map(({ code, label }) => [code, label]));
const processLabels = new Map(PROCESS_CATALOG.map(({ label, value }) => [value, label]));
const roastLevelLabels = new Map(ROAST_LEVEL_CATALOG.map(({ label, value }) => [value, label]));

export function isOriginCode(value: string): value is OriginCode {
  return originCodeSet.has(value);
}

export function isProcessCode(value: string): value is ProcessCode {
  return processCodeSet.has(value);
}

export function isRoastLevelCode(value: string): value is RoastLevelCode {
  return roastLevelCodeSet.has(value);
}

export function getOriginLabel(code: OriginCode) {
  return originLabels.get(code) ?? code;
}

export function getProcessLabel(code: ProcessCode) {
  return processLabels.get(code) ?? code;
}

export function getRoastLevelLabel(code: RoastLevelCode) {
  return roastLevelLabels.get(code) ?? code;
}
