"use server";

import { redirect } from "next/navigation";

import { getAppUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

function getCredentials(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || !email.includes("@")) {
    redirect("/login?error=Enter%20a%20valid%20email%20address.");
  }

  if (typeof password !== "string" || password.length < 8) {
    redirect("/login?error=Password%20must%20be%20at%20least%208%20characters.");
  }

  return { email: email.trim(), password };
}

export async function signIn(formData: FormData) {
  const credentials = getCredentials(formData);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    redirect("/login?error=Unable%20to%20sign%20in%20with%20those%20credentials.");
  }

  redirect("/");
}

export async function signUp(formData: FormData) {
  const credentials = getCredentials(formData);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...credentials,
    options: {
      emailRedirectTo: new URL("/auth/confirm", getAppUrl()).toString(),
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (data.session) {
    redirect("/");
  }

  redirect("/login?message=Check%20your%20email%20to%20confirm%20your%20account.");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
