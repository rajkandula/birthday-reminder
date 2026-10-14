import type { Metadata } from "next";
import Link from "next/link";

import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { zonedNow } from "@/lib/dates";

import { ContactEditor } from "../contact-editor";

export const metadata: Metadata = { title: "Add person" };

export default async function NewContactPage() {
  const user = await requireUser();
  const { year, month, day, hour } = zonedNow(user.timezone);
  return (
    <>
      <Link href="/contacts" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <Icon name="chevronLeft" className="size-4" /> People
      </Link>
      <PageHeader title="Add a person" description="Save their birthday once — Wishly takes care of every year after." />
      <ContactEditor
        sender={{
          name: user.sender_name || user.name,
          signature: user.signature,
          replyEmail: user.reply_email || user.email,
          email: user.email,
          defaultTemplate: user.default_template,
          sendHour: user.send_hour,
          localHour: hour,
          timezoneToday: { year, month, day },
        }}
      />
    </>
  );
}
