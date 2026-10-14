// Shared helpers for the deploy scripts: reads .env.local (values already in the
// environment win) and talks to the Harakumo REST API.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const ROOT = resolve(import.meta.dirname, "..");

export function loadEnv(required = ["HARAKUMO_API_KEY", "HARAKUMO_PROJECT_ID"]) {
  const env = { ...process.env };
  const file = resolve(ROOT, ".env.local");
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !(match[1] in process.env)) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
  for (const key of required) {
    if (!env[key]) throw new Error(`${key} is missing — add it to .env.local or the environment (see .env.example)`);
  }
  return env;
}

export function api(env) {
  const base = (env.HARAKUMO_BASE_URL || "https://harakumo.com").replace(/\/$/, "");
  return async function request(method, path, body, headers = {}) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${env.HARAKUMO_API_KEY}`,
        ...(body && !(body instanceof Uint8Array) ? { "content-type": "application/json" } : {}),
        ...headers,
      },
      body: body instanceof Uint8Array ? body : body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${typeof data === "string" ? data.slice(0, 300) : JSON.stringify(data)}`);
    return data;
  };
}
