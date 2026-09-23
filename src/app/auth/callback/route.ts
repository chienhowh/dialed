import { type NextRequest, NextResponse } from "next/server";

import { OAUTH_CALLBACK_ERROR, POST_LOGIN_PATH } from "@/features/auth/oauth";
import { getAppUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(POST_LOGIN_PATH, getAppUrl()));
    }
  }

  const errorUrl = new URL("/login", getAppUrl());
  errorUrl.searchParams.set("error", OAUTH_CALLBACK_ERROR);
  return NextResponse.redirect(errorUrl);
}
