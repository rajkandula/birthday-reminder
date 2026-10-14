// Harakumo edge function (deployed as "wishly-cron"; its address is printed by `npm run deploy:cron`).
// Runs the same dispatcher as the web app, with ~0ms cold starts, so an external
// scheduler can trigger birthday emails even while the web app is asleep.
// `npm run deploy:cron` bundles this file and deploys it. The function gets the project's
// production variables (HARAKUMO_API_KEY, HARAKUMO_DATABASE_ID, CRON_SECRET, ...) at deploy time.

import { runDispatch } from "../src/lib/dispatch";
import { createHarakumo } from "../src/lib/harakumo";

type Env = Record<string, string | undefined>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function client(env: Env) {
  return createHarakumo({
    apiKey: env.HARAKUMO_API_KEY ?? "",
    projectId: Number(env.HARAKUMO_PROJECT_ID),
    databaseId: Number(env.HARAKUMO_DATABASE_ID),
    baseUrl: env.HARAKUMO_BASE_URL || undefined,
  });
}

// Harakumo requires a literal `export default { fetch }` in the deployed code, so the
// deploy script appends that wrapper around these named handlers after bundling.
export async function handleFetch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/health") return json({ ok: true });

  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || url.searchParams.get("key");
  if (!env.CRON_SECRET || provided !== env.CRON_SECRET) return json({ error: "Unauthorized" }, 401);
  if (!env.HARAKUMO_API_KEY || !env.HARAKUMO_DATABASE_ID) return json({ error: "Function env vars are missing" }, 500);

  try {
    return json(await runDispatch(client(env)));
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Dispatch failed" }, 500);
  }
}

// Used automatically if the platform supports cron triggers for functions.
export async function handleScheduled(_event: unknown, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<void> {
  ctx.waitUntil(runDispatch(client(env)));
}
