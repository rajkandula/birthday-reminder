import { composeGreeting, savedGreeting, senderName, toEmailContent, type Greeting } from "./compose";
import { type Contact, type Send, type SendKind, type User, ensureSchema, setMeta } from "./db";
import { isBirthdayOn, nextBirthday, zonedNow } from "./dates";
import type { Harakumo } from "./harakumo";
import { renderEmail } from "./templates";
import { escapeHtml } from "./templates/shared";

// Runtime-agnostic: used by the Next.js app and by the Harakumo edge function.

const MAX_ATTEMPTS = 3;
const MAX_SENDS_PER_RUN = 25;
/** Automatic emails wait until a person hasn't been edited for this long, so a just-saved entry can be previewed. */
export const REVIEW_WINDOW_MINUTES = 10;

function minutesSince(sqlUtc: string, now: Date): number {
  return (now.getTime() - Date.parse(`${sqlUtc.replace(" ", "T")}Z`)) / 60_000;
}

function errorMessage(err: unknown): string {
  return (err instanceof Error ? err.message : String(err)).slice(0, 500);
}

export type DeliveryResult = { greeting: Greeting; templateId: string };

/** Compose, render and deliver one birthday email. */
export async function deliverGreeting(
  hk: Harakumo,
  opts: {
    user: User;
    contact: Contact;
    to: string;
    templateId?: string | null;
    turning: number | null;
    greeting?: Greeting;
    requireAI?: boolean;
  },
): Promise<DeliveryResult> {
  const { user, contact, turning } = opts;
  const greeting = opts.greeting ?? (await composeGreeting(hk, contact, user, turning, { requireAI: opts.requireAI }));
  const content = toEmailContent(greeting, contact, user, turning);
  const rendered = renderEmail(opts.templateId ?? contact.template ?? user.default_template, content);

  await hk.sendMail({
    to: opts.to,
    subject: greeting.subject,
    html: rendered.html,
    text: rendered.text,
    fromName: senderName(user),
    replyTo: user.reply_email.trim() || user.email,
  });
  return { greeting, templateId: rendered.templateId };
}

async function notifyOwner(hk: Harakumo, user: User, contact: Contact, greeting: Greeting): Promise<void> {
  const who = escapeHtml(contact.name);
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:28px;color:#1c1917;">
<p style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#e11d48;margin:0 0 8px;font-weight:700;">Wishly</p>
<h1 style="font-size:22px;margin:0 0 12px;">Today is ${who}'s birthday 🎂</h1>
<p style="font-size:15px;line-height:1.6;margin:0 0 18px;">We just sent your birthday email to <strong>${escapeHtml(contact.email)}</strong>. A quick call or message from you today would make it even better.</p>
<div style="border-left:3px solid #fda4af;padding:4px 0 4px 16px;color:#44403c;">
<p style="margin:0 0 6px;font-weight:600;">${escapeHtml(greeting.subject)}</p>
<p style="margin:0;white-space:pre-line;font-size:14px;line-height:1.6;">${escapeHtml(greeting.message)}</p>
</div></div>`;
  await hk.sendMail({
    to: user.email,
    subject: `🎂 Sent: birthday wishes to ${contact.name}`,
    html,
    text: `Today is ${contact.name}'s birthday. Wishly sent your email to ${contact.email}.\n\n${greeting.subject}\n\n${greeting.message}`,
    fromName: "Wishly",
  });
}

export async function recordSend(
  hk: Harakumo,
  row: { userId: number; contactId: number; year: number; kind: SendKind; to: string; status: "sent" | "failed"; result?: DeliveryResult; error?: string },
): Promise<void> {
  await hk.query(
    `INSERT INTO wishly_sends (user_id, contact_id, year, kind, status, to_email, subject, message, template, source, error, sent_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'sent' THEN datetime('now') END)`,
    [
      row.userId,
      row.contactId,
      row.year,
      row.kind,
      row.status,
      row.to,
      row.result?.greeting.subject ?? "",
      row.result?.greeting.message ?? "",
      row.result?.templateId ?? "",
      row.result?.greeting.source ?? "",
      row.error ?? "",
      row.status,
    ],
  );
}

export type DispatchOutcome = {
  contactId: number;
  userId: number;
  status: "sent" | "failed" | "skipped";
  reason?: string;
};

export type DispatchSummary = {
  ranAt: string;
  usersChecked: number;
  due: number;
  sent: number;
  failed: number;
  prepared?: number;
  outcomes: DispatchOutcome[];
};

type Candidate = Contact & { u_timezone: string; u_send_hour: number };

/**
 * Sends every birthday email that is due right now. Safe to call as often as you like:
 * each contact gets at most one automatic email per year (enforced by a unique index).
 */
export async function runDispatch(hk: Harakumo, opts: { userId?: number; now?: Date } = {}): Promise<DispatchSummary> {
  const now = opts.now ?? new Date();
  await ensureSchema(hk);

  // Across all timezones "today" is one of three calendar dates around UTC.
  const dates = [-1, 0, 1].map((offset) => zonedNow("UTC", new Date(now.getTime() + offset * 86_400_000)));
  const dateClauses: string[] = [];
  const params: (number | string)[] = [];
  for (const d of dates) {
    dateClauses.push("(c.birth_month = ? AND c.birth_day = ?)");
    params.push(d.month, d.day);
    if (d.month === 2 && d.day === 28) dateClauses.push("(c.birth_month = 2 AND c.birth_day = 29)");
  }
  let userFilter = "";
  if (opts.userId) {
    userFilter = "AND c.user_id = ?";
    params.push(opts.userId);
  }

  const { rows: candidates } = await hk.query<Candidate>(
    `SELECT c.*, u.timezone AS u_timezone, u.send_hour AS u_send_hour
     FROM wishly_contacts c JOIN wishly_users u ON u.id = c.user_id
     WHERE c.enabled = 1 AND (${dateClauses.join(" OR ")}) ${userFilter}`,
    params,
  );

  const summary: DispatchSummary = {
    ranAt: now.toISOString(),
    usersChecked: new Set(candidates.map((c) => c.user_id)).size,
    due: 0,
    sent: 0,
    failed: 0,
    outcomes: [],
  };

  const due = candidates
    .map((c) => ({ contact: c, local: zonedNow(c.u_timezone, now), sendHour: c.u_send_hour }))
    .filter(({ contact, local, sendHour }) => isBirthdayOn(contact.birth_month, contact.birth_day, local) && local.hour >= sendHour);
  summary.due = due.length;

  if (due.length) {
    const ids = due.map((d) => d.contact.id);
    const { rows: existing } = await hk.query<Pick<Send, "id" | "contact_id" | "year" | "status" | "attempts">>(
      `SELECT id, contact_id, year, status, attempts FROM wishly_sends WHERE kind = 'auto' AND contact_id IN (${ids.map(() => "?").join(",")})`,
      ids,
    );
    const users = new Map<number, User>();

    for (const { contact, local } of due) {
      if (summary.sent + summary.failed >= MAX_SENDS_PER_RUN) break;
      if (minutesSince(contact.updated_at, now) < REVIEW_WINDOW_MINUTES) {
        summary.outcomes.push({ contactId: contact.id, userId: contact.user_id, status: "skipped", reason: "recently edited" });
        continue;
      }
      const prior = existing.find((s) => s.contact_id === contact.id && s.year === local.year);
      let sendId: number;
      const attempt = prior ? prior.attempts + 1 : 1;

      if (prior) {
        if (prior.status !== "failed" || prior.attempts >= MAX_ATTEMPTS) {
          summary.outcomes.push({ contactId: contact.id, userId: contact.user_id, status: "skipped", reason: prior.status });
          continue;
        }
        const retry = await hk.query(
          "UPDATE wishly_sends SET status = 'pending', attempts = attempts + 1, error = '' WHERE id = ? AND status = 'failed' AND attempts < ?",
          [prior.id, MAX_ATTEMPTS],
        );
        if (retry.changes !== 1) continue;
        sendId = prior.id;
      } else {
        // Claim the (contact, year) slot first so concurrent runs can never double-send.
        const claim = await hk.query(
          "INSERT OR IGNORE INTO wishly_sends (user_id, contact_id, year, kind, status, to_email) VALUES (?, ?, ?, 'auto', 'pending', ?)",
          [contact.user_id, contact.id, local.year, contact.email],
        );
        if (claim.changes !== 1) {
          summary.outcomes.push({ contactId: contact.id, userId: contact.user_id, status: "skipped", reason: "claimed" });
          continue;
        }
        sendId = claim.lastRowId;
      }

      try {
        let user = users.get(contact.user_id);
        if (!user) {
          const { rows } = await hk.query<User>("SELECT * FROM wishly_users WHERE id = ?", [contact.user_id]);
          user = rows[0];
          if (!user) throw new Error("Owner account no longer exists");
          users.set(user.id, user);
        }
        const { turning } = nextBirthday(contact, local);
        // The saved message goes out exactly as written. Without one, AI writes it now — waiting for the
        // AI on early attempts; the final attempt may use the built-in message.
        const saved = savedGreeting(contact, user, turning, local.year);
        const result = await deliverGreeting(hk, {
          user,
          contact,
          to: contact.email,
          turning,
          greeting: saved ?? undefined,
          requireAI: attempt < MAX_ATTEMPTS,
        });
        await hk.query(
          `UPDATE wishly_sends SET status = 'sent', subject = ?, message = ?, template = ?, source = ?, to_email = ?, sent_at = datetime('now') WHERE id = ?`,
          [result.greeting.subject, result.greeting.message, result.templateId, result.greeting.source, contact.email, sendId],
        );
        summary.sent++;
        summary.outcomes.push({ contactId: contact.id, userId: contact.user_id, status: "sent" });

        if (user.notify_self && contact.email.toLowerCase() !== user.email.toLowerCase()) {
          await notifyOwner(hk, user, contact, result.greeting).catch(() => undefined);
        }
      } catch (err) {
        await hk
          .query("UPDATE wishly_sends SET status = 'failed', error = ? WHERE id = ?", [errorMessage(err), sendId])
          .catch(() => undefined);
        summary.failed++;
        summary.outcomes.push({ contactId: contact.id, userId: contact.user_id, status: "failed", reason: errorMessage(err) });
      }
    }
  }

  summary.prepared = await prepareUpcomingMessages(hk, now, opts.userId).catch((err) => {
    console.error("[wishly] preparing messages failed", err);
    return 0;
  });

  if (!opts.userId) {
    await setMeta(hk, "last_dispatch", JSON.stringify({ ...summary, outcomes: undefined })).catch(() => undefined);
  }
  return summary;
}

const PREPARE_DAYS = 7;
const MAX_PREPARED_PER_RUN = 10;

/**
 * Writes and saves the birthday message about a week ahead for people who don't have one for their
 * next birthday yet, so the owner can see (and edit) exactly what will be sent before the day.
 */
export async function prepareUpcomingMessages(hk: Harakumo, now: Date, userId?: number): Promise<number> {
  const clauses: string[] = [];
  const params: (number | string)[] = [];
  for (let offset = -1; offset <= PREPARE_DAYS + 1; offset++) {
    const d = zonedNow("UTC", new Date(now.getTime() + offset * 86_400_000));
    clauses.push("(c.birth_month = ? AND c.birth_day = ?)");
    params.push(d.month, d.day);
    if (d.month === 2 && d.day === 28) clauses.push("(c.birth_month = 2 AND c.birth_day = 29)");
  }
  if (userId) params.push(userId);

  const { rows } = await hk.query<Contact>(
    `SELECT c.* FROM wishly_contacts c JOIN wishly_users u ON u.id = c.user_id
     WHERE c.enabled = 1 AND u.ai_enabled = 1 AND (${clauses.join(" OR ")}) ${userId ? "AND c.user_id = ?" : ""}`,
    params,
  );

  const users = new Map<number, User>();
  let prepared = 0;
  for (const contact of rows) {
    if (prepared >= MAX_PREPARED_PER_RUN) break;
    let user = users.get(contact.user_id);
    if (!user) {
      user = (await hk.query<User>("SELECT * FROM wishly_users WHERE id = ?", [contact.user_id])).rows[0];
      if (!user) continue;
      users.set(user.id, user);
    }
    const local = zonedNow(user.timezone, now);
    const next = nextBirthday(contact, local);
    if (next.daysUntil > PREPARE_DAYS) continue;
    if (contact.message_body.trim() && contact.message_year === next.date.year) continue;
    if (next.daysUntil === 0 && local.hour >= user.send_hour) continue; // today's send writes its own

    try {
      const greeting = await composeGreeting(hk, contact, user, next.turning, { useAI: true, requireAI: true });
      // updated_at is left alone so preparing a message never delays a send.
      const saved = await hk.query(
        `UPDATE wishly_contacts SET message_subject = ?, message_headline = ?, message_body = ?, message_year = ?, message_source = 'ai'
         WHERE id = ? AND (message_body = '' OR message_year != ?)`,
        [greeting.subject, greeting.headline, greeting.message, next.date.year, contact.id, next.date.year],
      );
      if (saved.changes === 1) prepared++;
    } catch {
      // AI unavailable — the next run tries again, and the send itself can still write one.
    }
  }
  return prepared;
}
