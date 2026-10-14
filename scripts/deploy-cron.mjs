// Bundles worker/cron.ts and deploys it as a Harakumo edge function (default name "wishly-cron",
// override with CRON_FUNCTION_NAME). Usage: npm run deploy:cron
// The function is deployed with the project's production variables as they are now, so run
// `npm run deploy` (which syncs them) first.
import { build } from "esbuild";

import { api, loadEnv } from "./harakumo-env.mjs";

const env = loadEnv();
const NAME = env.CRON_FUNCTION_NAME || "wishly-cron";
const request = api(env);
const projectId = env.HARAKUMO_PROJECT_ID;

const result = await build({
  entryPoints: ["worker/cron.ts"],
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  write: false,
  outfile: "worker/dist/cron.js",
});
const bundled = result.outputFiles[0].text;
const exportStatement = /export\s*\{[^}]*\};?\s*$/;
if (!exportStatement.test(bundled)) throw new Error("Unexpected bundle shape: named export statement not found");
const code = `${bundled.replace(exportStatement, "")}
export default {
  fetch(request, env, ctx) {
    return handleFetch(request, env, ctx);
  },
  scheduled(event, env, ctx) {
    return handleScheduled(event, env, ctx);
  },
};
`;
console.log(`→ Bundled ${NAME} (${(code.length / 1024).toFixed(1)} KB)`);

const { functions = [] } = await request("GET", `/api/projects/${projectId}/functions`);
const existing = functions.find((f) => f.name === NAME);
const saved = existing
  ? await request("PUT", `/api/functions/${existing.id}`, { code })
  : await request("POST", `/api/projects/${projectId}/functions`, { name: NAME, runtime: "edge", code });

const url = saved.url ?? saved.function?.url ?? existing?.url ?? "(no address yet — check the function in the dashboard)";
console.log(`✓ ${existing ? "Updated" : "Created"} ${NAME}: ${url}`);
console.log(`  Trigger it every 10–15 minutes with: GET <url>/?key=$CRON_SECRET (this URL is your CRON_URL)`);
