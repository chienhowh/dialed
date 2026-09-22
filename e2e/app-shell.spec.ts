import { expect, test } from "@playwright/test";

import { createTestUser, deleteTestUser, signIn, type TestUser } from "./support/test-user";

let user: TestUser;

test.beforeAll(async () => {
  user = await createTestUser("shell");
});

test.afterAll(async () => {
  await deleteTestUser(user);
});

test.beforeEach(async ({ page }) => {
  await signIn(page, user);
});

test("renders the mobile shell and navigates between primary destinations", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "What are you brewing today?" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();

  await page.getByRole("link", { name: "Coffee", exact: true }).click();
  await expect(page).toHaveURL(/\/coffee$/);
  await expect(page.getByRole("heading", { name: "My Coffee" })).toBeVisible();

  await page.getByRole("link", { name: "History", exact: true }).click();
  await expect(page).toHaveURL(/\/history$/);
  await expect(page.getByRole("heading", { name: "Brew History" })).toBeVisible();
});

test("exposes the basic PWA assets", async ({ request }) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  await expect(manifestResponse.json()).resolves.toMatchObject({
    name: "Dialed Coffee Brewing Assistant",
    display: "standalone",
    start_url: "/",
  });

  const serviceWorkerResponse = await request.get("/sw.js");
  expect(serviceWorkerResponse.ok()).toBe(true);
  expect(serviceWorkerResponse.headers()["content-type"]).toContain("application/javascript");
  const serviceWorker = await serviceWorkerResponse.text();
  expect(serviceWorker).toContain('const CACHE_NAME = "dialed-static-v2"');
  expect(serviceWorker).toContain('event.request.mode === "navigate"');
  expect(serviceWorker).toContain("caches.delete(key)");
  expect(serviceWorker).not.toContain("cache.put");
  expect(serviceWorker).not.toContain('caches.match("/")');
});

test("registers the service worker in the production shell", async ({ page }) => {
  const scriptUrl = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active?.scriptURL;
  });

  expect(scriptUrl).toBe("http://localhost:3000/sw.js");
});

test("never stores or serves authenticated navigation HTML from Cache Storage", async ({ context, page }) => {
  await page.goto("/");
  await page.goto("/coffee");
  await page.goto("/history");

  const cachedUrls = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const cacheName of await caches.keys()) {
      const cache = await caches.open(cacheName);
      urls.push(...(await cache.keys()).map(({ url }) => url));
    }
    return urls;
  });

  expect(cachedUrls.every((url) => new URL(url).pathname === "/icon.svg")).toBe(true);
  expect(cachedUrls.some((url) => ["/", "/coffee", "/history"].includes(new URL(url).pathname))).toBe(false);

  await page.goto("about:blank");
  await context.setOffline(true);
  await expect(page.goto("/coffee", { waitUntil: "domcontentloaded" })).rejects.toThrow();
  await expect(page.getByRole("heading", { name: "My Coffee" })).toHaveCount(0);
  await context.setOffline(false);
});
