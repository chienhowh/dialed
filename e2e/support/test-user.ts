import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const password = "Dialed-test-password-2026";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Local Supabase integration-test environment is missing.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type TestUser = {
  email: string;
  id: string;
  password: string;
};

export async function createTestUser(prefix: string): Promise<TestUser> {
  const email = `${prefix}-${crypto.randomUUID()}@example.com`;
  const { data, error } = await getAdminClient().auth.admin.createUser({
    email,
    email_confirm: true,
    password,
  });

  if (error) throw error;
  return { email, id: data.user.id, password };
}

export async function deleteTestUser(user?: TestUser) {
  if (user) await getAdminClient().auth.admin.deleteUser(user.id);
}

export async function signIn(page: Page, user: TestUser) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("/");
}
