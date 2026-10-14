// Thin REST client for Harakumo (database, mail, AI gateway).
// Runtime-agnostic on purpose: it only uses fetch, so the same code runs in the
// Next.js server and in the Harakumo edge function that triggers the dispatcher.

export type HarakumoConfig = {
  apiKey: string;
  projectId: number;
  databaseId: number;
  baseUrl?: string;
};

export class HarakumoError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "HarakumoError";
  }
}

export type QueryResult<T> = { rows: T[]; changes: number; lastRowId: number };

export type MailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  fromName?: string;
  replyTo?: string;
};

export type Harakumo = ReturnType<typeof createHarakumo>;

type SqlValue = string | number | null;

export function createHarakumo(config: HarakumoConfig) {
  const base = (config.baseUrl || "https://harakumo.com").replace(/\/$/, "");

  async function call<T>(path: string, body: unknown, attempt = 0): Promise<T> {
    let res: Response;
    try {
      res = await fetch(base + path, {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      if (attempt < 1) return call<T>(path, body, attempt + 1);
      throw err;
    }

    const raw = await res.text();
    let data: unknown = raw;
    try {
      data = JSON.parse(raw);
    } catch {
      // non-JSON body; keep the raw text for the error message
    }

    if (!res.ok) {
      // Retry transient upstream failures once.
      if (res.status >= 500 && attempt < 1) return call<T>(path, body, attempt + 1);
      const apiError = data && typeof data === "object" && "error" in data ? String((data as { error: unknown }).error) : "";
      const message = apiError || `Harakumo ${path} failed with ${res.status}`;
      throw new HarakumoError(message, res.status, data);
    }
    return data as T;
  }

  return {
    projectId: config.projectId,

    /** One SQL statement with positional `?` params. */
    async query<T = Record<string, unknown>>(sql: string, params: SqlValue[] = []): Promise<QueryResult<T>> {
      const data = await call<{ results?: T[]; meta?: { changes?: number; last_row_id?: number } }>(
        `/api/databases/${config.databaseId}`,
        params.length ? { sql, params } : { sql },
      );
      return {
        rows: data.results ?? [],
        changes: data.meta?.changes ?? 0,
        lastRowId: data.meta?.last_row_id ?? 0,
      };
    },

    async sendMail(input: MailInput): Promise<void> {
      const payload = {
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        projectId: config.projectId,
        ...(input.fromName ? { fromName: input.fromName } : {}),
      };
      if (!input.replyTo) {
        await call("/api/mail/send", payload);
        return;
      }
      try {
        await call("/api/mail/send", { ...payload, replyTo: input.replyTo });
      } catch (err) {
        // replyTo is not a documented field; if the API rejects the payload, send without it.
        // (A request that was bad for another reason simply fails again with the same error.)
        if (err instanceof HarakumoError && (err.status === 400 || err.status === 422)) {
          await call("/api/mail/send", payload);
          return;
        }
        throw err;
      }
    },

    async generate(prompt: string, model = "auto"): Promise<{ output: string; modelUsed?: string; cost?: number }> {
      return call("/api/ai/playground", { model, prompt });
    },
  };
}
