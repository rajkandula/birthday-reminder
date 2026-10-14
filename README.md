# Wishly — never miss a birthday

Wishly stores the birthdays of the people you care about and, on the day, emails each of them a
personal, AI-written birthday message in a designed template, sent in your name.

Wishly is open source under the [MIT licence](LICENSE) and is listed on
[Nucleus](https://nucleus.harakumo.com/-/explore). It is built on Harakumo: its database, email,
AI and scheduler all run on Harakumo services through one API key.

## Features

- **Multi-user**: anyone can sign up and manage their own people.
- **People**: name, nickname, email, birthday (year optional), relationship, tone, notes for the AI,
  optional rough words of your own for the AI to polish, per-person template, auto-send on/off.
  Bulk import by pasting a list.
- **6 email templates**: Confetti Pop, Midnight Gold, Clean Professional, Warm Sunrise, Neon Party, Botanical.
- **AI messages** (Harakumo AI Gateway) written fresh each year from your notes, with a built-in fallback.
  About a week ahead, the message is written and saved on the person so you can read and edit exactly
  what will be sent.
- **Scheduling** in each user's timezone at their chosen hour; Feb 29 birthdays go out on Feb 28 in
  non-leap years. Each person gets at most one automatic email per year, even if the dispatcher runs
  concurrently, and failed sends retry up to 3 times.
- **Extras**: live preview, "Write with AI", send a test to yourself, send now, send history, and an
  optional heads-up copy to you.

## Harakumo services used

| Need      | Harakumo service                                                                  |
| --------- | --------------------------------------------------------------------------------- |
| Hosting   | Deployments — a Next.js **server app**                                            |
| Database  | Edge SQLite (tables prefixed `wishly_`, created automatically on first request)   |
| Email     | Mail (`<your sender name> <no-reply@harakumo.com>`, or your own sending domain)  |
| AI        | AI Gateway (`model: "auto"`)                                                      |
| Scheduler | An edge function (`worker/cron.ts`, deployed as `wishly-cron`)                    |

All of it goes through `src/lib/harakumo.ts`, a small `fetch`-only REST client, so the same code runs
in the Next.js server and in the edge function.

## Run locally

You need Node.js 20.11+ and a Harakumo project with an Edge SQLite database (steps 1–3 below), since
the app keeps its data there.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Locally the background scheduler is off so a dev server never emails anyone by surprise.
Set `WISHLY_SCHEDULER=on` to enable it.

## Run Wishly on Harakumo

Wishly is a Node server (Next.js with server actions, a background scheduler and an API route), so on
Harakumo it runs as a **server app** (Pro plan and up), not a static site. Your Harakumo account's
email must be verified before you can deploy or send mail.

1. **Create a project** at [harakumo.com/dashboard](https://harakumo.com/dashboard) → Projects → New
   project. Its numeric id is `HARAKUMO_PROJECT_ID`.
2. **Create an API key** (Settings → API keys). It is `HARAKUMO_API_KEY`; the app uses it for the
   database, Mail and the AI Gateway.
3. **Create a database**: in the project, Databases → new Edge SQLite database. Its numeric id is
   `HARAKUMO_DATABASE_ID`. Wishly creates its tables on the first request; nothing to run by hand.
4. **AI and Mail** need no extra setup: AI requests count toward your workspace's AI usage, and mail
   goes from `no-reply@harakumo.com` under each user's sender name until you add your own sending
   domain in Mail. (The settings page and the person editor show that default address.)
5. **Add the environment** (Project → Environment), from `.env.example`:
   - `HARAKUMO_API_KEY`, `HARAKUMO_PROJECT_ID`, `HARAKUMO_DATABASE_ID`
   - `AUTH_SECRET` — signs session cookies (`openssl rand -base64 48`)
   - `CRON_SECRET` — protects the dispatcher (`openssl rand -hex 24`)
   - Optional: `APP_URL` (the app's public URL), `HARAKUMO_BASE_URL`, `WISHLY_SCHEDULER=off` to turn
     off the in-app scheduler.
6. **Deploy the app** from this folder with the CLI, or ask your AI assistant with the Harakumo connector:

   ```bash
   npm i -g @harakumo/cli
   harakumo login --key <your API key>
   harakumo deploy <project id> .
   ```

   Or, with the values in `.env.local`, `npm run deploy` syncs them to the project's environment,
   uploads the source and waits for the build. Every deploy is saved as a commit in the project's
   private Nucleus repo.
7. **Deploy the cron edge function**: `npm run deploy:cron` bundles `worker/cron.ts` with esbuild and
   creates (or updates) the `wishly-cron` function in the project, then prints its URL. The function
   gets the project's environment as it is at deploy time, so deploy it after step 5/6, and run it
   again whenever you change `CRON_SECRET` or the database.
8. **Call the dispatcher on a schedule** (next section).

## Keeping the scheduler running (important)

Harakumo has no built-in cron yet, and idle apps go to sleep, so something needs to call the
dispatcher every 10–15 minutes. Calls are idempotent, so extra calls are harmless:

```
GET <cron function URL>/?key=<CRON_SECRET>
```

The web app exposes the same dispatcher at `/api/cron/dispatch` (`?key=<CRON_SECRET>` or
`Authorization: Bearer <CRON_SECRET>`), if you would rather not deploy the function.

Pick one:

1. **GitHub Actions:** `.github/workflows/wishly-cron.yml` runs every 15 minutes once you add the
   repository secret `CRON_SECRET` and a `CRON_URL` secret or variable (the function URL above). Until
   both are set it skips quietly. GitHub pauses schedules after 60 days of repository inactivity — any
   push or a manual run re-enables it.
2. **Any cron service or uptime pinger:** create a job for the URL above every 15 minutes.

Safety nets: the web app also checks every 10 minutes while it's awake, and whenever you open your
dashboard.

## Project layout

```
src/lib/harakumo.ts      REST client (database, mail, AI)
src/lib/db.ts            schema + queries
src/lib/dispatch.ts      the scheduler: who is due, claim, compose, send, record
src/lib/compose.ts       AI prompt, fallbacks, placeholders
src/lib/templates/       the six email designs
src/lib/dates.ts         timezone & birthday math
src/app/(app)/           dashboard, people, templates, history, settings
src/app/actions/         server actions
src/app/api/cron/        the dispatcher as an HTTP endpoint
worker/cron.ts           Harakumo edge function entry
scripts/                 deploy scripts (app and cron function)
```

## License

[MIT](LICENSE) © 2026 Charan Raj Kandula
