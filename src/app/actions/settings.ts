"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { hk } from "@/lib/server";
import { getTemplate } from "@/lib/templates";
import { type FormState, fieldErrors, settingsSchema } from "@/lib/validation";

export async function updateSettings(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Please fix the highlighted fields." };
  const s = parsed.data;

  await hk().query(
    `UPDATE wishly_users SET name = ?, sender_name = ?, reply_email = ?, signature = ?, timezone = ?, send_hour = ?,
       default_template = ?, ai_enabled = ?, notify_self = ? WHERE id = ?`,
    [
      s.name,
      s.sender_name || s.name,
      s.reply_email,
      s.signature,
      s.timezone,
      s.send_hour,
      s.default_template,
      s.ai_enabled ? 1 : 0,
      s.notify_self ? 1 : 0,
      user.id,
    ],
  );
  revalidatePath("/", "layout");
  return { ok: true, message: "Settings saved." };
}

export async function setDefaultTemplate(formData: FormData): Promise<void> {
  const user = await requireUser();
  const template = getTemplate(String(formData.get("template")));
  await hk().query("UPDATE wishly_users SET default_template = ? WHERE id = ?", [template.id, user.id]);
  redirect("/templates?default=1");
}
