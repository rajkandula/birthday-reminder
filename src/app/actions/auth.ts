"use server";

import { redirect } from "next/navigation";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { getUserByEmail } from "@/lib/db";
import { isValidTimeZone } from "@/lib/dates";
import { hk } from "@/lib/server";
import { type FormState, fieldErrors, loginSchema, signupSchema } from "@/lib/validation";

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function signup(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { name, email, password, timezone } = parsed.data;

  const client = hk();
  if (await getUserByEmail(client, email)) {
    return { errors: { email: ["An account with this email already exists. Try signing in."] } };
  }

  const tz = timezone && isValidTimeZone(timezone) ? timezone : "UTC";
  const result = await client.query(
    `INSERT OR IGNORE INTO wishly_users (email, name, password_hash, sender_name, reply_email, signature, timezone)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [email, name, await hashPassword(password), name, email, `Warm wishes,\n${name.split(" ")[0]}`, tz],
  );
  if (result.changes !== 1) {
    return { errors: { email: ["An account with this email already exists. Try signing in."] } };
  }

  await createSession(result.lastRowId);
  redirect("/dashboard?welcome=1");
}

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const user = await getUserByEmail(hk(), parsed.data.email);
  const valid = user ? await verifyPassword(parsed.data.password, user.password_hash) : false;
  if (!user || !valid) return { message: "That email and password don't match." };

  await createSession(user.id);
  redirect(safeNext(formData.get("next")));
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}
