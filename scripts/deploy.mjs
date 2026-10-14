// Deploys the Next.js app to Harakumo: syncs production env vars, uploads the source, waits for the build.
// Usage: npm run deploy   (reads HARAKUMO_* and the secrets from .env.local or the environment)
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ROOT, api, loadEnv } from "./harakumo-env.mjs";

const env = loadEnv(["HARAKUMO_API_KEY", "HARAKUMO_PROJECT_ID", "HARAKUMO_DATABASE_ID", "AUTH_SECRET", "CRON_SECRET"]);
const request = api(env);
const projectId = env.HARAKUMO_PROJECT_ID;

const { project } = await request("GET", `/api/projects/${projectId}`);
// The project's live address once it has one; before the first deploy, its default address.
const appUrl = env.PRODUCTION_APP_URL || project.live_url || `https://${project.slug}.harakumo.app`;
console.log(`→ Project ${project.name} (${appUrl})`);

const production = {
  HARAKUMO_API_KEY: env.HARAKUMO_API_KEY,
  HARAKUMO_PROJECT_ID: env.HARAKUMO_PROJECT_ID,
  HARAKUMO_DATABASE_ID: env.HARAKUMO_DATABASE_ID,
  AUTH_SECRET: env.AUTH_SECRET,
  CRON_SECRET: env.CRON_SECRET,
  APP_URL: appUrl,
  ...(env.HARAKUMO_BASE_URL ? { HARAKUMO_BASE_URL: env.HARAKUMO_BASE_URL } : {}),
};
for (const [key, value] of Object.entries(production)) {
  await request("POST", `/api/projects/${projectId}/env`, { key, value });
}
console.log(`→ Synced ${Object.keys(production).length} environment variables`);

const dir = mkdtempSync(join(tmpdir(), "wishly-deploy-"));
const archive = join(dir, "app.tgz");
execFileSync(
  "tar",
  [
    "-czf",
    archive,
    "--no-xattrs",
    "--no-mac-metadata",
    "--exclude=./node_modules",
    "--exclude=./.next",
    "--exclude=./.git",
    "--exclude=./.env*",
    "--exclude=./.claude",
    "--exclude=./worker/dist",
    "--exclude=*.tsbuildinfo",
    "--exclude=.DS_Store",
    "-C",
    ROOT,
    ".",
  ],
  { env: { ...process.env, COPYFILE_DISABLE: "1" } },
);
const bytes = new Uint8Array(readFileSync(archive));
rmSync(dir, { recursive: true, force: true });
console.log(`→ Uploading source (${(bytes.length / 1024).toFixed(0)} KB)`);

const { deployment } = await request("POST", `/api/projects/${projectId}/deployments/upload`, bytes, { "content-type": "application/gzip" });
console.log(`→ Deployment #${deployment.id} ${deployment.status}`);

let current = deployment;
let printed = 0;
const started = Date.now();
while (!["ready", "failed", "error", "cancelled"].includes(current.status)) {
  await new Promise((r) => setTimeout(r, 5000));
  ({ deployment: current } = await request("GET", `/api/deployments/${deployment.id}`));
  const lines = String(current.logs ?? "").split("\n");
  for (const line of lines.slice(printed)) if (line.trim()) console.log(`  ${line}`);
  printed = lines.length;
  if (Date.now() - started > 20 * 60_000) throw new Error("Timed out waiting for the deployment");
}

if (current.status !== "ready") {
  console.error(`✗ Deployment ${current.status}. Full logs: GET /api/deployments/${deployment.id}`);
  process.exit(1);
}
console.log(`✓ Live at ${current.preview_url || appUrl}`);
