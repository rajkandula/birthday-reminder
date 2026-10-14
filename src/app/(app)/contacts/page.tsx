import type { Metadata } from "next";
import Link from "next/link";

import { Icon } from "@/components/icons";
import { Avatar, Badge, ButtonLink, Card, Notice, PageHeader, inputClass } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { RELATIONSHIPS } from "@/lib/compose";
import { listContacts } from "@/lib/db";
import { formatBirthday, nextBirthday, relativeDays, zonedNow } from "@/lib/dates";
import { hk } from "@/lib/server";
import { getTemplate } from "@/lib/templates";

import { EnabledToggle } from "./enabled-toggle";

export const metadata: Metadata = { title: "People" };

export default async function ContactsPage({ searchParams }: PageProps<"/contacts">) {
  const user = await requireUser();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";
  const rel = typeof params.rel === "string" ? params.rel : "";

  const contacts = await listContacts(hk(), user.id);
  const today = zonedNow(user.timezone);
  const rows = contacts
    .filter((c) => !q || c.name.toLowerCase().includes(q) || c.email.includes(q) || c.nickname.toLowerCase().includes(q))
    .filter((c) => !rel || c.relationship === rel)
    .map((c) => ({ contact: c, next: nextBirthday(c, today) }))
    .sort((a, b) => a.next.daysUntil - b.next.daysUntil || a.contact.name.localeCompare(b.contact.name));

  return (
    <>
      <PageHeader
        title="People"
        description={`${contacts.length} ${contacts.length === 1 ? "person" : "people"}, sorted by whose birthday is next.`}
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

      {params.deleted && (
        <div className="mb-6">
          <Notice>Person deleted.</Notice>
        </div>
      )}
      {params.imported && (
        <div className="mb-6">
          <Notice>Imported {String(params.imported)} people. Review their tone and template any time.</Notice>
        </div>
      )}

      <form className="mb-4 flex flex-col gap-2 sm:flex-row" role="search">
        <div className="relative flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
          <input name="q" defaultValue={q} placeholder="Search by name or email" aria-label="Search people" className={`${inputClass} pl-10`} />
        </div>
        <select name="rel" defaultValue={rel} aria-label="Filter by relationship" className={`${inputClass} sm:w-44`}>
          <option value="">Everyone</option>
          {RELATIONSHIPS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <button type="submit" className="h-11 cursor-pointer rounded-xl bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-stone-700">
          Filter
        </button>
      </form>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-semibold">{contacts.length ? "No one matches that search." : "No one here yet."}</p>
            <p className="mt-1 text-sm text-muted">{contacts.length ? "Try a different name." : "Add someone or paste a list to import."}</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map(({ contact, next }) => (
              <li key={contact.id} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-stone-50 sm:px-5">
                <Link href={`/contacts/${contact.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                  <Avatar name={contact.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {contact.name}
                      {contact.nickname && <span className="font-normal text-muted"> · “{contact.nickname}”</span>}
                    </p>
                    <p className="truncate text-sm text-muted">
                      {formatBirthday(contact.birth_month, contact.birth_day)} · {contact.email}
                    </p>
                  </div>
                  <div className="hidden items-center gap-1.5 md:flex">
                    <Badge>{RELATIONSHIPS.find((r) => r.id === contact.relationship)?.label ?? contact.relationship}</Badge>
                    <Badge tone="blue">{getTemplate(contact.template ?? user.default_template).name}</Badge>
                  </div>
                  <span className="hidden w-24 text-right text-sm font-medium text-muted sm:block">{relativeDays(next.daysUntil)}</span>
                </Link>
                <EnabledToggle id={contact.id} enabled={Boolean(contact.enabled)} name={contact.name} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
