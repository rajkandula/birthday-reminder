import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";

import { Icon, type IconName } from "@/components/icons";
import { Avatar, Badge, ButtonLink, Card, Notice, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { RELATIONSHIPS } from "@/lib/compose";
import { listContacts, listSends } from "@/lib/db";
import { formatHour, formatShortDate, nextBirthday, ordinal, relativeDays, zonedNow } from "@/lib/dates";
import { runDispatch } from "@/lib/dispatch";
import { hk } from "@/lib/server";
import { getTemplate } from "@/lib/templates";

export const metadata: Metadata = { title: "Dashboard" };

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser();
  const { welcome } = await searchParams;
  const client = hk();
  const [contacts, sends] = await Promise.all([listContacts(client, user.id), listSends(client, user.id, 300)]);

  // Catch-up: whenever the owner opens the app, send anything that is due but hasn't gone out yet.
  after(() => runDispatch(client, { userId: user.id }).catch((err) => console.error("[wishly] catch-up failed", err)));

  const now = zonedNow(user.timezone);
  const enabled = contacts.filter((c) => c.enabled);
  const upcoming = enabled
    .map((contact) => ({ contact, next: nextBirthday(contact, now) }))
    .sort((a, b) => a.next.daysUntil - b.next.daysUntil || a.contact.name.localeCompare(b.contact.name));
  const today = upcoming.filter((u) => u.next.daysUntil === 0);
  const soon = upcoming.filter((u) => u.next.daysUntil > 0 && u.next.daysUntil <= 60).slice(0, 8);
  const autoThisYear = new Map(sends.filter((s) => s.kind === "auto" && s.year === now.year).map((s) => [s.contact_id, s]));
  const sentThisYear = sends.filter((s) => s.status === "sent" && s.kind !== "test" && s.year === now.year).length;
  const relLabel = (id: string) => RELATIONSHIPS.find((r) => r.id === id)?.label ?? id;

  const stats: { label: string; value: string; icon: IconName; hint: string }[] = [
    { label: "People", value: String(contacts.length), icon: "users", hint: `${enabled.length} with auto-send on` },
    {
      label: "This month",
      value: String(contacts.filter((c) => c.birth_month === now.month).length),
      icon: "calendar",
      hint: "birthdays",
    },
    { label: "Wishes sent", value: String(sentThisYear), icon: "send", hint: `in ${now.year}` },
    {
      label: "Next up",
      value: upcoming[0] ? relativeDays(upcoming[0].next.daysUntil) : "—",
      icon: "cake",
      hint: upcoming[0] ? upcoming[0].contact.name : "add someone to start",
    },
  ];

  return (
    <div className="animate-float-up">
      <PageHeader
        title={`${greeting(now.hour)}, ${user.name.split(" ")[0]}`}
        description={
          <>
            Birthday emails go out at <strong className="text-ink">{formatHour(user.send_hour)}</strong> ({user.timezone}) on the day,
            signed as <strong className="text-ink">{user.sender_name || user.name}</strong>.
          </>
        }
        actions={
          <>
            <ButtonLink href="/contacts/import" variant="secondary" icon="upload">
              Import
            </ButtonLink>
            <ButtonLink href="/contacts/new" icon="plus">
              Add person
            </ButtonLink>
          </>
        }
      />

      {welcome && (
        <div className="mb-6">
          <Notice tone="rose">Welcome to Wishly! Add the people you care about and we&apos;ll take care of the rest.</Notice>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-muted">
              <Icon name={s.icon} className="size-4 text-brand" />
              {s.label}
            </div>
            <p className="mt-3 font-display text-3xl font-semibold tracking-tight">{s.value}</p>
            <p className="mt-1 truncate text-sm text-muted">{s.hint}</p>
          </Card>
        ))}
      </div>

      {today.length > 0 && (
        <section className="mt-8" aria-labelledby="today-heading">
          <div className="overflow-hidden rounded-3xl bg-linear-to-br from-rose-500 via-rose-500 to-orange-400 p-6 text-white shadow-lg shadow-rose-200 sm:p-8">
            <p id="today-heading" className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-100">
              Today
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              {today.map((t) => t.contact.name).join(" & ")} {today.length === 1 ? "is" : "are"} celebrating!
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {today.map(({ contact, next }) => {
                const send = autoThisYear.get(contact.id);
                const status =
                  send?.status === "sent"
                    ? "Birthday email sent"
                    : send?.status === "failed"
                      ? "Sending failed — will retry"
                      : send?.status === "pending"
                        ? "Sending now…"
                        : now.hour < user.send_hour
                          ? `Scheduled for ${formatHour(user.send_hour)}`
                          : "Sending shortly";
                return (
                  <li key={contact.id}>
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="flex items-center gap-3 rounded-2xl bg-white/15 p-3 ring-1 ring-white/25 transition-colors hover:bg-white/25"
                    >
                      <Avatar name={contact.name} className="bg-white text-rose-600" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {contact.name}
                          {next.turning ? ` · ${ordinal(next.turning)}` : ""}
                        </p>
                        <p className="text-sm text-rose-50">{status}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="p-2 sm:p-3">
          <div className="flex items-center justify-between px-3 pb-2 pt-3">
            <h2 className="font-display text-xl font-semibold">Coming up</h2>
            <Link href="/contacts" className="text-sm font-semibold text-brand hover:underline">
              All people
            </Link>
          </div>
          {soon.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-brand">
                <Icon name="cake" className="size-7" />
              </span>
              <p className="mt-4 font-semibold">{contacts.length ? "No birthdays in the next 60 days" : "Nobody here yet"}</p>
              <p className="mt-1 max-w-sm text-sm text-muted">
                {contacts.length
                  ? "Enjoy the quiet. We'll handle the next one when it comes around."
                  : "Add family, friends and colleagues — Wishly will remember their birthdays for you."}
              </p>
              {!contacts.length && (
                <ButtonLink href="/contacts/new" icon="plus" className="mt-5">
                  Add your first person
                </ButtonLink>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {soon.map(({ contact, next }) => (
                <li key={contact.id}>
                  <Link href={`/contacts/${contact.id}`} className="flex items-center gap-4 rounded-2xl px-3 py-3 transition-colors hover:bg-stone-50">
                    <Avatar name={contact.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{contact.name}</p>
                      <p className="truncate text-sm text-muted">
                        {formatShortDate(next.date)}
                        {next.turning ? ` · turning ${next.turning}` : ""} · {getTemplate(contact.template ?? user.default_template).name}
                      </p>
                    </div>
                    <div className="hidden sm:block">
                      <Badge tone="stone">{relLabel(contact.relationship)}</Badge>
                    </div>
                    <Badge tone={next.daysUntil <= 7 ? "rose" : "stone"}>{relativeDays(next.daysUntil)}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="font-display text-xl font-semibold">How it works</h2>
            <ol className="mt-4 space-y-4 text-sm">
              {[
                { icon: "users" as const, title: "Add people", body: "Name, email and birthday. Notes help the AI personalise." },
                { icon: "palette" as const, title: "Pick a design", body: "Choose a template per person or set a default." },
                { icon: "sparkles" as const, title: "We write & send", body: "On the day, AI writes a personal note and emails it from you." },
              ].map((step) => (
                <li key={step.title} className="flex gap-3">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-brand">
                    <Icon name={step.icon} className="size-4" />
                  </span>
                  <div>
                    <p className="font-semibold">{step.title}</p>
                    <p className="text-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
          <Card className="p-6">
            <h2 className="font-semibold">Recent activity</h2>
            {sends.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Sent emails will show up here.</p>
            ) : (
              <ul className="mt-3 space-y-3 text-sm">
                {sends.slice(0, 4).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      {s.kind === "test" ? "Test for " : ""}
                      {s.contact_name ?? "Deleted person"}
                    </span>
                    <Badge tone={s.status === "sent" ? "green" : s.status === "failed" ? "red" : "amber"}>{s.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/history" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
              View history <Icon name="arrowRight" className="size-3.5" />
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
