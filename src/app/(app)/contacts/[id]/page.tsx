import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteContact } from "@/app/actions/contacts";
import { SubmitButton } from "@/components/client";
import { Icon } from "@/components/icons";
import { Badge, Card, Notice, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { getContact, listSends } from "@/lib/db";
import { formatBirthday, formatShortDate, nextBirthday, relativeDays, zonedNow } from "@/lib/dates";
import { hk } from "@/lib/server";

import { ContactEditor } from "../contact-editor";
import { ConfirmDelete } from "./confirm-delete";

export const metadata: Metadata = { title: "Edit person" };

export default async function ContactPage({ params, searchParams }: PageProps<"/contacts/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const { saved, ai } = await searchParams;
  const client = hk();
  const contact = await getContact(client, user.id, Number(id));
  if (!contact) notFound();

  const today = zonedNow(user.timezone);
  const next = nextBirthday(contact, today);
  const history = (await listSends(client, user.id, 300)).filter((s) => s.contact_id === contact.id).slice(0, 10);

  return (
    <>
      <Link href="/contacts" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <Icon name="chevronLeft" className="size-4" /> People
      </Link>
      <PageHeader
        title={contact.name}
        description={
          <>
            {formatBirthday(contact.birth_month, contact.birth_day, contact.birth_year)} · next birthday{" "}
            <strong className="text-ink">{formatShortDate(next.date)}</strong> ({relativeDays(next.daysUntil).toLowerCase()})
            {next.turning ? `, turning ${next.turning}` : ""}
          </>
        }
      />
      {saved && (
        <div className="mb-6">
          {ai === "0" ? (
            <Notice tone="amber">Saved — but the AI couldn&apos;t write the message right now. Click “Write with AI” to try again, or Wishly will write it before the birthday.</Notice>
          ) : (
            <Notice>
              Saved. {contact.enabled ? "The message below is exactly what Wishly will send on their birthday." : "Auto-send is off for this person."}
            </Notice>
          )}
        </div>
      )}

      <ContactEditor
        key={`${contact.id}-${contact.updated_at}-${contact.message_year}-${contact.message_body.length}`}
        contact={contact}
        sender={{
          name: user.sender_name || user.name,
          signature: user.signature,
          replyEmail: user.reply_email || user.email,
          email: user.email,
          defaultTemplate: user.default_template,
          sendHour: user.send_hour,
          localHour: today.hour,
          timezoneToday: { year: today.year, month: today.month, day: today.day },
        }}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="p-6">
          <h2 className="font-display text-xl font-semibold">Emails to {contact.name.split(" ")[0]}</h2>
          {history.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nothing sent yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {history.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.subject || "(no subject)"}</p>
                    <p className="text-muted">
                      {new Date(`${s.created_at.replace(" ", "T")}Z`).toLocaleString("en-US", { timeZone: user.timezone, dateStyle: "medium", timeStyle: "short" })} · {s.to_email}
                    </p>
                    {s.error && <p className="text-red-600">{s.error}</p>}
                  </div>
                  <div className="flex gap-1.5">
                    <Badge tone={s.kind === "auto" ? "blue" : "stone"}>{s.kind}</Badge>
                    <Badge tone={s.status === "sent" ? "green" : s.status === "failed" ? "red" : "amber"}>{s.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="border-red-100 p-6">
          <h2 className="font-semibold text-red-800">Remove person</h2>
          <p className="mt-1 text-sm text-muted">Deletes {contact.name} and stops future emails. Send history is kept.</p>
          <form action={deleteContact} className="mt-4">
            <input type="hidden" name="id" value={contact.id} />
            <ConfirmDelete name={contact.name}>
              <SubmitButton variant="danger" icon="trash" pendingText="Deleting…">
                Delete {contact.name.split(" ")[0]}
              </SubmitButton>
            </ConfirmDelete>
          </form>
        </Card>
      </div>
    </>
  );
}
