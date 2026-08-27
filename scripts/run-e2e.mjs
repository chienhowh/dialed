import { spawnSync } from "node:child_process";

function run(command, args, environment) {
  const result = spawnSync(command, args, {
    env: environment,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function readLocalSupabaseEnvironment() {
  const supabaseCommand = process.platform === "win32" ? "supabase.cmd" : "supabase";
  const result = spawnSync(supabaseCommand, ["status", "--output", "json"], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    throw new Error("Local Supabase is not running. Run npm run db:start first.");
  }

  const status = JSON.parse(result.stdout);
  const publishableKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  const serviceRoleKey = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;

  if (!status.API_URL || !publishableKey || !serviceRoleKey) {
    throw new Error("Supabase CLI status did not return the required local API keys.");
  }

  return {
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  };
}

const environment = {
  ...process.env,
  ...readLocalSupabaseEnvironment(),
};

run("npm", ["run", "build"], environment);
const playwrightCommand = process.platform === "win32" ? "playwright.cmd" : "playwright";
run(playwrightCommand, ["test"], environment);
