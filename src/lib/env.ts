const LOCAL_APP_URL = "http://localhost:3000";

export function getAppUrl(value = process.env.APP_URL): URL {
  try {
    return new URL(value ?? LOCAL_APP_URL);
  } catch {
    throw new Error("APP_URL must be a valid absolute URL.");
  }
}
