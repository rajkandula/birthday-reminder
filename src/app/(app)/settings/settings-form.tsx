"use client";

import { useState, useTransition } from "react";

import { runMyChecks } from "@/app/actions/sends";
import { updateSettings } from "@/app/actions/settings";
import { Spinner, SubmitButton, useFormAction } from "@/components/client";
import { Icon } from "@/components/icons";
import { Card, Field, Notice, buttonClass, inputClass } from "@/components/ui";
import { formatHour } from "@/lib/dates";
import { TEMPLATES } from "@/lib/templates";

type SettingsUser = {
  name: string;
  email: string;
  sender_name: string;
  reply_email: string;
  signature: string;
  timezone: string;
  send_hour: number;
  default_template: string;
  ai_enabled: boolean;
  notify_self: boolean;
};

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

export function SettingsForm({ user, timezones, lastRunAt }: { user: SettingsUser; timezones: string[]; lastRunAt: string | null }) {
  const { state, onSubmit, pending } = useFormAction(updateSettings, undefined);
  const errors = state?.errors;
  const [senderName, setSenderName] = useState(user.sender_name || user.name);
  const [check, setCheck] = useState<{ ok: boolean; text: string } | null>(null);
  const [checking, startCheck] = useTransition();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <form onSubmit={onSubmit} className="space-y-6">
        {state?.message && <Notice tone={state.ok ? "green" : "red"}>{state.message}</Notice>}

        <Card className="space-y-5 p-6">
          <h2 className="font-display text-xl font-semibold">How you appear</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Your name" htmlFor="name" error={errors?.name}>
              <input id="name" name="name" defaultValue={user.name} required className={inputClass} />
            </Field>
            <Field label="Sender name" htmlFor="sender_name" error={errors?.sender_name} hint="Shown in the recipient's inbox.">
              <input id="sender_name" name="sender_name" value={senderName} onChange={(e) => setSenderName(e.target.value)} maxLength={64} className={inputClass} />
            </Field>
          </div>
          <div className="rounded-2xl bg-stone-50 px-4 py-3 text-sm">
            <span className="text-muted">Inbox preview: </span>
            <span className="font-semibold">{senderName || user.name}</span> <span className="text-muted">&lt;no-reply@harakumo.com&gt;</span>
          </div>
          <Field label="Replies go to" htmlFor="reply_email" error={errors?.reply_email} hint={`Leave empty to use ${user.email}. Every email includes a reply button to this address.`}>
            <input id="reply_email" name="reply_email" type="email" defaultValue={user.reply_email} placeholder={user.email} className={inputClass} />
          </Field>
          <Field label="Sign-off" htmlFor="signature" error={errors?.signature} hint="Two lines work best, e.g. “With love,” then your name.">
            <textarea id="signature" name="signature" rows={2} defaultValue={user.signature} maxLength={200} className={inputClass} />
          </Field>
        </Card>

        <Card className="space-y-5 p-6">
          <h2 className="font-display text-xl font-semibold">When emails go out</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Your timezone" htmlFor="timezone" error={errors?.timezone}>
              <select id="timezone" name="timezone" defaultValue={user.timezone} className={inputClass}>
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Send time" htmlFor="send_hour" hint="On the morning of the birthday is a nice touch.">
              <select id="send_hour" name="send_hour" defaultValue={user.send_hour} className={inputClass}>
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {formatHour(h)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Default template" htmlFor="default_template">
            <select id="default_template" name="default_template" defaultValue={user.default_template} className={inputClass}>
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.bestFor}
                </option>
              ))}
            </select>
          </Field>
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="font-display text-xl font-semibold">Automation</h2>
          <Toggle name="ai_enabled" defaultChecked={user.ai_enabled} title="Write every message with AI" body="AI writes each person's birthday message from your notes — you can review and edit it before it's sent. When off, write messages yourself; anyone without one gets Wishly's built-in message." />
          <Toggle name="notify_self" defaultChecked={user.notify_self} title="Email me when a wish is sent" body="Get a heads-up on the day with a copy of the message, so you can call or text too." />
        </Card>

        <div className="flex justify-end">
          <SubmitButton pending={pending} icon="check">
            Save settings
          </SubmitButton>
        </div>
      </form>

      <aside className="space-y-4">
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
            </span>
            <h2 className="font-semibold">Birthday scheduler</h2>
          </div>
          <p className="mt-2 text-sm text-muted">
            {lastRunAt ? <>Last automatic check {timeAgo(lastRunAt)}.</> : "Waiting for the first automatic check."} Emails that are due are also sent whenever you open your dashboard.
          </p>
          {check && (
            <div className="mt-3">
              <Notice tone={check.ok ? "green" : "red"}>{check.text}</Notice>
            </div>
          )}
          <button
            type="button"
            disabled={checking}
            onClick={() =>
              startCheck(async () => {
                const result = await runMyChecks();
                setCheck({ ok: result.ok, text: result.message ?? "Done." });
              })
            }
            className={`${buttonClass("secondary", "sm")} mt-4 w-full`}
          >
            {checking ? <Spinner /> : <Icon name="refresh" className="size-4" />} Check for due birthdays now
          </button>
        </Card>
        <Card className="p-6 text-sm">
          <h2 className="flex items-center gap-2 font-semibold">
            <Icon name="shield" className="size-4 text-brand" /> Your data
          </h2>
          <p className="mt-2 text-muted">
            Contacts are private to your account and only used to send the emails you set up. Email delivery is authenticated (SPF, DKIM and DMARC).
          </p>
        </Card>
      </aside>
    </div>
  );
}

function Toggle({ name, defaultChecked, title, body }: { name: string; defaultChecked: boolean; title: string; body: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-4 transition-colors hover:bg-stone-50">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-5 shrink-0 accent-rose-600" />
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{body}</span>
      </span>
    </label>
  );
}
