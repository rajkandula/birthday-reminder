import type { Harakumo } from "./harakumo";

// All tables are prefixed `wishly_` so the database can be shared with other apps.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS wishly_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  sender_name TEXT NOT NULL DEFAULT '',
  reply_email TEXT NOT NULL DEFAULT '',
  signature TEXT NOT NULL DEFAULT '',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  send_hour INTEGER NOT NULL DEFAULT 9,
  default_template TEXT NOT NULL DEFAULT 'confetti',
  ai_enabled INTEGER NOT NULL DEFAULT 1,
  notify_self INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS wishly_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  nickname TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  birth_month INTEGER NOT NULL,
  birth_day INTEGER NOT NULL,
  birth_year INTEGER,
  relationship TEXT NOT NULL DEFAULT 'friend',
  tone TEXT NOT NULL DEFAULT 'warm',
  notes TEXT NOT NULL DEFAULT '',
  template TEXT,
  custom_message TEXT NOT NULL DEFAULT '',
  message_mode TEXT NOT NULL DEFAULT 'ai',
  message_subject TEXT NOT NULL DEFAULT '',
  message_headline TEXT NOT NULL DEFAULT '',
  message_body TEXT NOT NULL DEFAULT '',
  message_year INTEGER NOT NULL DEFAULT 0,
  message_source TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS wishly_contacts_user ON wishly_contacts(user_id);
CREATE INDEX IF NOT EXISTS wishly_contacts_date ON wishly_contacts(birth_month, birth_day);
CREATE TABLE IF NOT EXISTS wishly_sends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  contact_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  kind TEXT NOT NULL DEFAULT 'auto',
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 1,
  to_email TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  template TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS wishly_sends_auto_once ON wishly_sends(contact_id, year) WHERE kind = 'auto';
CREATE INDEX IF NOT EXISTS wishly_sends_user ON wishly_sends(user_id, created_at);
CREATE TABLE IF NOT EXISTS wishly_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const ADDED_CONTACT_COLUMNS: [string, string][] = [
  ["message_mode", "TEXT NOT NULL DEFAULT 'ai'"],
  ["message_subject", "TEXT NOT NULL DEFAULT ''"],
  ["message_headline", "TEXT NOT NULL DEFAULT ''"],
  ["message_body", "TEXT NOT NULL DEFAULT ''"],
  ["message_year", "INTEGER NOT NULL DEFAULT 0"],
  ["message_source", "TEXT NOT NULL DEFAULT ''"],
];

let schemaReady: Promise<void> | null = null;

export function ensureSchema(hk: Harakumo): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      // Multiple statements are allowed when no params are passed.
      await hk.query(SCHEMA);
      // Columns added after the first release.
      const { rows } = await hk.query<{ name: string }>("SELECT name FROM pragma_table_info('wishly_contacts')");
      const existing = new Set(rows.map((r) => r.name));
      for (const [column, definition] of ADDED_CONTACT_COLUMNS) {
        if (existing.has(column)) continue;
        await hk.query(`ALTER TABLE wishly_contacts ADD COLUMN ${column} ${definition}`).catch((err) => {
          if (!/duplicate column/i.test(String(err))) throw err;
        });
        if (column === "message_body") {
          // "Send my words exactly" messages become the saved birthday message.
          await hk.query(
            `UPDATE wishly_contacts SET message_body = custom_message, message_source = 'edited', custom_message = '',
               message_year = CAST(strftime('%Y', 'now') AS INTEGER)
             WHERE message_mode = 'exact' AND custom_message != ''`,
          );
        }
      }
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

export type User = {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  sender_name: string;
  reply_email: string;
  signature: string;
  timezone: string;
  send_hour: number;
  default_template: string;
  ai_enabled: number;
  notify_self: number;
  created_at: string;
};

export type Contact = {
  id: number;
  user_id: number;
  name: string;
  nickname: string;
  email: string;
  birth_month: number;
  birth_day: number;
  birth_year: number | null;
  relationship: string;
  tone: string;
  notes: string;
  template: string | null;
  /** The sender's rough words — input for the AI, never sent as-is. */
  custom_message: string;
  /** Legacy (pre-saved-message) flag; kept for old rows. */
  message_mode: string;
  /** The saved birthday message that is sent exactly, for the birthday in `message_year`. */
  message_subject: string;
  message_headline: string;
  message_body: string;
  message_year: number;
  /** "ai" = written by AI and untouched, "edited" = changed or written by the user. */
  message_source: string;
  enabled: number;
  created_at: string;
  updated_at: string;
};

export type SendKind = "auto" | "manual" | "test";
export type SendStatus = "pending" | "sent" | "failed";

export type Send = {
  id: number;
  user_id: number;
  contact_id: number;
  year: number;
  kind: SendKind;
  status: SendStatus;
  attempts: number;
  to_email: string;
  subject: string;
  message: string;
  template: string;
  source: string;
  error: string;
  created_at: string;
  sent_at: string | null;
};

export async function getUserById(hk: Harakumo, id: number): Promise<User | null> {
  await ensureSchema(hk);
  const { rows } = await hk.query<User>("SELECT * FROM wishly_users WHERE id = ?", [id]);
  return rows[0] ?? null;
}

export async function getUserByEmail(hk: Harakumo, email: string): Promise<User | null> {
  await ensureSchema(hk);
  const { rows } = await hk.query<User>("SELECT * FROM wishly_users WHERE email = ?", [email.toLowerCase()]);
  return rows[0] ?? null;
}

export async function listContacts(hk: Harakumo, userId: number): Promise<Contact[]> {
  await ensureSchema(hk);
  const { rows } = await hk.query<Contact>(
    "SELECT * FROM wishly_contacts WHERE user_id = ? ORDER BY birth_month, birth_day, name",
    [userId],
  );
  return rows;
}

export async function getContact(hk: Harakumo, userId: number, id: number): Promise<Contact | null> {
  await ensureSchema(hk);
  const { rows } = await hk.query<Contact>("SELECT * FROM wishly_contacts WHERE id = ? AND user_id = ?", [id, userId]);
  return rows[0] ?? null;
}

export type SendRow = Send & { contact_name: string | null; age_minutes: number };

export async function listSends(hk: Harakumo, userId: number, limit = 100): Promise<SendRow[]> {
  await ensureSchema(hk);
  const { rows } = await hk.query<SendRow>(
    `SELECT s.*, c.name AS contact_name, CAST((julianday('now') - julianday(s.created_at)) * 1440 AS INTEGER) AS age_minutes
     FROM wishly_sends s
     LEFT JOIN wishly_contacts c ON c.id = s.contact_id
     WHERE s.user_id = ? ORDER BY s.created_at DESC, s.id DESC LIMIT ?`,
    [userId, limit],
  );
  return rows;
}

export async function getMeta(hk: Harakumo, key: string): Promise<{ value: string; updated_at: string } | null> {
  await ensureSchema(hk);
  const { rows } = await hk.query<{ value: string; updated_at: string }>(
    "SELECT value, updated_at FROM wishly_meta WHERE key = ?",
    [key],
  );
  return rows[0] ?? null;
}

export async function setMeta(hk: Harakumo, key: string, value: string): Promise<void> {
  await hk.query(
    `INSERT INTO wishly_meta (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value],
  );
}
