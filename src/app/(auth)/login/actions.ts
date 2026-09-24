"use server";

import { redirect } from "next/navigation";

import { getAuthCallbackUrl } from "@/features/auth/oauth";
import { createClient } from "@/lib/supabase/server";

export type GoogleSignInState = {
  message: string | null;
};

export async function signInWithGoogle(): Promise<GoogleSignInState> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getAuthCallbackUrl(),
      queryParams: {
        prompt: "select_account"
      }
    },
  });

  if (error || !data.url) {
    return { message: "Unable to start Google sign-in. Please try again." };
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
