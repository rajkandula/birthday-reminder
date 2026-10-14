import "server-only";

import { createHarakumo, type Harakumo } from "./harakumo";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return value;
}

let client: Harakumo | null = null;

/** Harakumo client configured from the environment (server only). */
export function hk(): Harakumo {
  if (!client) {
    client = createHarakumo({
      apiKey: required("HARAKUMO_API_KEY"),
      projectId: Number(required("HARAKUMO_PROJECT_ID")),
      databaseId: Number(required("HARAKUMO_DATABASE_ID")),
      baseUrl: process.env.HARAKUMO_BASE_URL || undefined,
    });
  }
  return client;
}

export function authSecret(): Uint8Array {
  return new TextEncoder().encode(required("AUTH_SECRET"));
}

export function cronSecret(): string {
  return required("CRON_SECRET");
}

export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
