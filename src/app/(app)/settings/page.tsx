import type { Metadata } from "next";

import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { getMeta } from "@/lib/db";
import { hk } from "@/lib/server";

import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const lastRun = await getMeta(hk(), "last_dispatch");
  const timezones = Intl.supportedValuesOf("timeZone");
  if (!timezones.includes(user.timezone)) timezones.unshift(user.timezone);

  return (
    <>
      <PageHeader title="Settings" description="Control how your birthday emails look, sound and when they go out." />
      <SettingsForm
        user={{
          name: user.name,
          email: user.email,
          sender_name: user.sender_name,
          reply_email: user.reply_email,
          signature: user.signature,
          timezone: user.timezone,
          send_hour: user.send_hour,
          default_template: user.default_template,
          ai_enabled: Boolean(user.ai_enabled),
          notify_self: Boolean(user.notify_self),
        }}
        timezones={timezones}
        lastRunAt={lastRun ? `${lastRun.updated_at.replace(" ", "T")}Z` : null}
      />
    </>
  );
}
