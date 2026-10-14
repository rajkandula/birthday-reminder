"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { RELATIONSHIPS, composeGreeting } from "@/lib/compose";
import { type Contact, getContact } from "@/lib/db";
import { daysInMonth, nextBirthday, zonedNow } from "@/lib/dates";
import { hk } from "@/lib/server";
import { type FormState, contactSchema, fieldErrors } from "@/lib/validation";

export async function saveContact(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Please fix the highlighted fields." };
  const c = parsed.data;
  const client = hk();

  const existing = c.id ? await getContact(client, user.id, c.id) : null;
  if (c.id && !existing) return { message: "That person no longer exists." };

  // The saved message is what gets sent. Write it with AI when there isn't one yet, or when the
  // AI-written one no longer matches the details (a message the user edited is never overwritten).
  const upcoming = nextBirthday(c, zonedNow(user.timezone));
  let message = { subject: c.message_subject, headline: c.message_headline, body: c.message_body, source: c.message_body ? c.message_source : "" };
  let aiFailed = false;
  if (user.ai_enabled && (!message.body || (message.source === "ai" && c.message_stale))) {
    const draft: Contact = {
      ...c,
      id: c.id ?? 0,
      user_id: user.id,
      message_mode: "ai",
      message_subject: "",
      message_headline: "",
      message_body: "",
      message_year: 0,
      message_source: "",
      enabled: c.enabled ? 1 : 0,
      created_at: "",
      updated_at: "",
    };
    try {
      const greeting = await composeGreeting(client, draft, user, upcoming.turning, { useAI: true, requireAI: true });
      message = { subject: greeting.subject, headline: greeting.headline, body: greeting.message, source: "ai" };
    } catch {
      aiFailed = true;
    }
  }

  const values = [
    c.name,
    c.nickname,
    c.email,
    c.birth_month,
    c.birth_day,
    c.birth_year,
    c.relationship,
    c.tone,
    c.notes,
    c.template,
    c.custom_message,
    message.subject,
    message.headline,
    message.body,
    message.body ? upcoming.date.year : 0,
    message.source,
    c.enabled ? 1 : 0,
  ];

  let id = c.id;
  if (id) {
    await client.query(
      `UPDATE wishly_contacts SET name = ?, nickname = ?, email = ?, birth_month = ?, birth_day = ?, birth_year = ?,
         relationship = ?, tone = ?, notes = ?, template = ?, custom_message = ?, message_subject = ?, message_headline = ?,
         message_body = ?, message_year = ?, message_source = ?, message_mode = 'ai', enabled = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`,
      [...values, id, user.id],
    );
  } else {
    const result = await client.query(
      `INSERT INTO wishly_contacts (name, nickname, email, birth_month, birth_day, birth_year, relationship, tone, notes,
         template, custom_message, message_subject, message_headline, message_body, message_year, message_source, enabled, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [...values, user.id],
    );
    id = result.lastRowId;
  }

  redirect(`/contacts/${id}?saved=1${aiFailed ? "&ai=0" : ""}`);
}

export async function deleteContact(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id) && id > 0) {
    await hk().query("DELETE FROM wishly_contacts WHERE id = ? AND user_id = ?", [id, user.id]);
  }
  redirect("/contacts?deleted=1");
}

export async function toggleContact(id: number, enabled: boolean): Promise<void> {
  const user = await requireUser();
  await hk().query("UPDATE wishly_contacts SET enabled = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?", [
    enabled ? 1 : 0,
    id,
    user.id,
  ]);
  revalidatePath("/contacts");
}

const RELATIONSHIP_IDS = new Set<string>(RELATIONSHIPS.map((r) => r.id));

/**
 * Bulk import, one person per line:  Name, email, birthday[, relationship]
 * Birthday accepts YYYY-MM-DD, MM-DD, DD/MM/YYYY or "June 21".
 */
export async function importContacts(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = String(formData.get("rows") ?? "");
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { message: "Paste at least one line." };
  if (lines.length > 300) return { message: "Import up to 300 people at a time." };

  const problems: string[] = [];
  const valid: (string | number | null)[][] = [];

  lines.forEach((line, index) => {
    const [name, email, birthday, relationship] = line.split(/\s*[,;\t]\s*/);
    if (index === 0 && /email/i.test(email ?? "") && !email.includes("@")) return; // header row
    const date = parseBirthday(birthday ?? "");
    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !date) {
      problems.push(`Line ${index + 1}: “${line.slice(0, 60)}”`);
      return;
    }
    const rel = (relationship ?? "friend").toLowerCase();
    valid.push([
      user.id,
      name.slice(0, 80),
      email.toLowerCase(),
      date.month,
      date.day,
      date.year,
      RELATIONSHIP_IDS.has(rel) ? rel : "friend",
      rel === "colleague" || rel === "client" ? "professional" : "warm",
    ]);
  });

  const client = hk();
  for (const row of valid) {
    await client.query(
      `INSERT INTO wishly_contacts (user_id, name, email, birth_month, birth_day, birth_year, relationship, tone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      row,
    );
  }

  if (problems.length) {
    return {
      ok: valid.length > 0,
      message: `Imported ${valid.length} ${valid.length === 1 ? "person" : "people"}. Couldn't read ${problems.length} line(s): ${problems
        .slice(0, 5)
        .join("; ")}`,
    };
  }
  redirect(`/contacts?imported=${valid.length}`);
}

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function parseBirthday(value: string): { month: number; day: number; year: number | null } | null {
  const v = value.trim();
  let month = 0;
  let day = 0;
  let year: number | null = null;
  let m: RegExpMatchArray | null;

  if ((m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else if ((m = v.match(/^(\d{1,2})-(\d{1,2})$/))) [month, day] = [Number(m[1]), Number(m[2])];
  else if ((m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else if ((m = v.match(/^([a-z]+)\s+(\d{1,2})(?:\s+(\d{4}))?$/i))) {
    month = MONTH_NAMES.indexOf(m[1].slice(0, 3).toLowerCase()) + 1;
    day = Number(m[2]);
    year = m[3] ? Number(m[3]) : null;
  } else return null;

  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(month, 2024)) return null;
  if (year !== null && (year < 1900 || year > new Date().getFullYear())) year = null;
  return { month, day, year };
}
