import type { Page } from "@playwright/test";
import { createBrowserClient } from "@supabase/ssr";
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Local Supabase integration-test environment is missing.");
  }

  let authCookies: Array<{ name: string; value: string }> = [];
  const supabase = createBrowserClient(url, publishableKey, {
    isSingleton: false,
    cookies: {
      getAll: () => authCookies,
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          authCookies = authCookies.filter((cookie) => cookie.name !== name);
          if (value) authCookies.push({ name, value });
        }
      },
    },
  });
  const { error } = await supabase.auth.signInWithPassword(user);

  if (error) throw error;

  const appUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
  await page.context().addCookies(
    authCookies.map(({ name, value }) => ({ name, url: appUrl, value })),
  );
  await page.goto("/");
}
