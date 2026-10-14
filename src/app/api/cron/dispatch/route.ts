import { NextResponse, type NextRequest } from "next/server";

import { runDispatch } from "@/lib/dispatch";
import { cronSecret, hk } from "@/lib/server";

export const maxDuration = 60;

function authorized(request: NextRequest): boolean {
  const header = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const provided = header || request.nextUrl.searchParams.get("key") || "";
  const expected = cronSecret();
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

// Call this every 5–15 minutes from any scheduler. It is idempotent.
async function handle(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await runDispatch(hk()));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Dispatch failed" }, { status: 500 });
  }
}

export { handle as GET, handle as POST };
