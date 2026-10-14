"use server";

import { requireUser } from "@/lib/auth/session";
import { composeGreeting, savedGreeting, type Greeting } from "@/lib/compose";
import { type Contact, getContact } from "@/lib/db";
import { nextBirthday, zonedNow } from "@/lib/dates";
import { deliverGreeting, recordSend, runDispatch } from "@/lib/dispatch";
import { hk } from "@/lib/server";
import { getTemplate } from "@/lib/templates";
import { draftSchema, greetingSchema } from "@/lib/validation";

type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; message: string };

async function loadContext(contactId: number) {
  const user = await requireUser();
  const contact = await getContact(hk(), user.id, contactId);
  if (!contact) throw new Error("That person no longer exists.");
  const today = zonedNow(user.timezone);
  const { turning } = nextBirthday(contact, today);
  return { user, contact, today, turning };
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong.";
}

export type DraftInput = {
  name: string;
  nickname: string;
  relationship: string;
  tone: string;
  notes: string;
  custom_message: string;
  birth_month: number;
  birth_day: number;
  birth_year: number | null;
};

/** Writes a preview message from the (possibly unsaved) form values. Nothing is stored or sent. */
export async function draftGreeting(input: DraftInput): Promise<ActionResult<Greeting>> {
  const user = await requireUser();
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Add a name and birthday first." };
  const today = zonedNow(user.timezone);
  const contact: Contact = {
    ...parsed.data,
    id: 0,
    user_id: user.id,
    email: "",
    template: null,
    message_mode: "ai",
    message_subject: "",
    message_headline: "",
    message_body: "",
    message_year: 0,
    message_source: "",
    enabled: 1,
    created_at: "",
    updated_at: "",
  };
  try {
    const { turning } = nextBirthday(contact, today);
    const greeting = await composeGreeting(hk(), contact, user, turning, { useAI: true });
    return {
      ok: true,
      data: greeting,
      message: greeting.source === "fallback" ? "AI was unavailable, so this uses Wishly's built-in message." : undefined,
    };
  } catch (err) {
    return { ok: false, message: errorText(err) };
  }
}

export async function sendGreeting(
  contactId: number,
  mode: "test" | "manual",
  templateId: string | null,
  draft: Greeting | null,
): Promise<ActionResult> {
  let ctx: Awaited<ReturnType<typeof loadContext>>;
  try {
    ctx = await loadContext(contactId);
  } catch (err) {
    return { ok: false, message: errorText(err) };
  }
  const { user, contact, today, turning } = ctx;
  const parsedDraft = draft ? greetingSchema.safeParse(draft) : null;
  if (parsedDraft && !parsedDraft.success) return { ok: false, message: "The message looks incomplete — add some text and try again." };
  // What's in the editor wins; otherwise the saved message for their next birthday; otherwise AI writes one now.
  const greeting = parsedDraft?.data ?? savedGreeting(contact, user, turning, nextBirthday(contact, today).date.year) ?? undefined;

  const to = mode === "test" ? user.email : contact.email;
  const client = hk();
  try {
    const result = await deliverGreeting(client, {
      user,
      contact,
      to,
      turning,
      templateId: templateId ? getTemplate(templateId).id : null,
      greeting,
    });
    await recordSend(client, { userId: user.id, contactId: contact.id, year: today.year, kind: mode, to, status: "sent", result });
    return { ok: true, message: mode === "test" ? `Test sent to ${to}. Check your inbox (and spam).` : `Birthday email sent to ${contact.name}!` };
  } catch (err) {
    await recordSend(client, {
      userId: user.id,
      contactId: contact.id,
      year: today.year,
      kind: mode,
      to,
      status: "failed",
      error: errorText(err),
    }).catch(() => undefined);
    return { ok: false, message: `Couldn't send: ${errorText(err)}` };
  }
}

export async function runMyChecks(): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const summary = await runDispatch(hk(), { userId: user.id });
    if (summary.sent) return { ok: true, message: `Sent ${summary.sent} birthday email${summary.sent === 1 ? "" : "s"}.` };
    if (summary.failed) return { ok: false, message: `${summary.failed} email(s) failed — see History for details.` };
    return { ok: true, message: "All caught up. Nothing is due right now." };
  } catch (err) {
    return { ok: false, message: errorText(err) };
  }
}
