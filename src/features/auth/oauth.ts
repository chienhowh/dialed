import { getAppUrl } from "@/lib/env";

export const AUTH_CALLBACK_PATH = "/auth/callback";
export const OAUTH_CALLBACK_ERROR = "oauth_callback";
export const POST_LOGIN_PATH = "/";

export function getAuthCallbackUrl(appUrl = getAppUrl()): string {
  return new URL(AUTH_CALLBACK_PATH, appUrl).toString();
}
