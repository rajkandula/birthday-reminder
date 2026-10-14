"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { saveContact } from "@/app/actions/contacts";
import { draftGreeting, sendGreeting } from "@/app/actions/sends";
import { EmailFrame, Spinner, SubmitButton, useFormAction } from "@/components/client";
import { Icon } from "@/components/icons";
import { Badge, Card, Field, Notice, buttonClass, cn, inputClass } from "@/components/ui";
import { RELATIONSHIPS, TONES, fillPlaceholders, type Greeting } from "@/lib/compose";
import type { Contact } from "@/lib/db";
import { MONTHS, daysInMonth, formatHour, formatShortDate, nextBirthday } from "@/lib/dates";
import { TEMPLATES, getTemplate, renderEmail } from "@/lib/templates";
import { firstName } from "@/lib/templates/shared";

type Sender = {
  name: string;
  signature: string;
  replyEmail: string;
  email: string;
  defaultTemplate: string;
  sendHour: number;
  localHour: number;
  timezoneToday: { year: number; month: number; day: number };
};

const PERSONAL = new Set(["family", "partner", "friend"]);

/** The details the AI writes from — when they change, an untouched AI message is out of date. */
function aiInputsKey(v: { name: string; nickname: string; relationship: string; tone: string; notes: string; customMessage: string; year: string }) {
  return JSON.stringify([v.name.trim(), v.nickname.trim(), v.relationship, v.tone, v.notes.trim(), v.customMessage.trim(), v.year.trim()]);
}

export function ContactEditor({ contact, sender }: { contact?: Contact; sender: Sender }) {
  const { state, onSubmit, pending } = useFormAction(saveContact, undefined);
  const errors = state?.errors;

  const [name, setName] = useState(contact?.name ?? "");
  const [nickname, setNickname] = useState(contact?.nickname ?? "");
  const [relationship, setRelationship] = useState(contact?.relationship ?? "friend");
  const [tone, setTone] = useState(contact?.tone ?? "warm");
  const [notes, setNotes] = useState(contact?.notes ?? "");
  const [month, setMonth] = useState(contact?.birth_month ?? 0);
  const [day, setDay] = useState(contact?.birth_day ?? 0);
  const [year, setYear] = useState(contact?.birth_year ? String(contact.birth_year) : "");
  const [template, setTemplate] = useState<string>(contact?.template ?? "");
  const [customMessage, setCustomMessage] = useState(contact?.custom_message ?? "");
  const [enabled, setEnabled] = useState(contact ? Boolean(contact.enabled) : true);

  // The saved birthday message — only shown if it was written for their next birthday.
  const savedIsCurrent = Boolean(
    contact?.message_body && contact.message_year >= nextBirthday(contact, sender.timezoneToday).date.year,
  );
  const [subject, setSubject] = useState(savedIsCurrent ? contact!.message_subject : "");
  const [headline, setHeadline] = useState(savedIsCurrent ? contact!.message_headline : "");
  const [body, setBody] = useState(savedIsCurrent ? contact!.message_body : "");
  const [source, setSource] = useState<"ai" | "edited" | "">(savedIsCurrent ? (contact!.message_source === "ai" ? "ai" : "edited") : "");
  const [writtenFrom, setWrittenFrom] = useState<string | null>(
    savedIsCurrent && contact!.message_source === "ai"
      ? aiInputsKey({ ...contact!, customMessage: contact!.custom_message, year: contact!.birth_year ? String(contact!.birth_year) : "" })
      : null,
  );

  const [feedback, setFeedback] = useState<{ tone: "green" | "red" | "amber"; text: string; place: "message" | "send" } | null>(null);
  const [busy, setBusy] = useState<"draft" | "test" | "send" | null>(null);
  const [, startTransition] = useTransition();

  const currentKey = aiInputsKey({ name, nickname, relationship, tone, notes, customMessage, year });
  const stale = source === "ai" && writtenFrom !== null && writtenFrom !== currentKey;
  const who = nickname.trim() || firstName(name.trim()) || "Friend";
  const hasBirthday = Boolean(month && day);
  const next = hasBirthday ? nextBirthday({ birth_month: month, birth_day: day, birth_year: /^\d{4}$/.test(year) ? Number(year) : null }, sender.timezoneToday) : null;
  const turning = next?.turning ?? null;
  const birthdayIsToday = next?.daysUntil === 0;
  const effectiveTemplate = template || sender.defaultTemplate;

  const fill = (text: string) => fillPlaceholders(text, { name: name || who, nickname, turning, sender: sender.name });
  const previewHtml = renderEmail(effectiveTemplate, {
    recipientName: who,
    headline: fill(headline.trim()) || `Happy Birthday, ${who}!`,
    message: fill(body.trim()) || "No message yet.\n\nClick “Write with AI” to write one from what you told us — or just save, and Wishly writes it for you.",
    senderName: sender.name,
    signature: sender.signature,
    replyEmail: sender.replyEmail,
    turning: turning && PERSONAL.has(relationship) ? turning : null,
  }).html;

  const maxDay = month ? daysInMonth(month, 2024) : 31;

  function writeWithAI() {
    if (!name.trim() || !month || !day) {
      setFeedback({ tone: "amber", text: "Add a name and birthday first so the AI knows who it's writing for.", place: "message" });
      return;
    }
    if (source === "edited" && body.trim() && !window.confirm("Replace your edited message with a new one written by AI?")) return;
    const keyAtRequest = currentKey;
    setBusy("draft");
    setFeedback(null);
    startTransition(async () => {
      const result = await draftGreeting({
        name,
        nickname,
        relationship,
        tone,
        notes,
        custom_message: customMessage,
        birth_month: month,
        birth_day: day,
        birth_year: /^\d{4}$/.test(year) ? Number(year) : null,
      });
      setBusy(null);
      if (result.ok && result.data) {
        setSubject(result.data.subject);
        setHeadline(result.data.headline);
        setBody(result.data.message);
        setSource(result.data.source === "ai" ? "ai" : "edited");
        setWrittenFrom(result.data.source === "ai" ? keyAtRequest : null);
        setFeedback({ tone: result.message ? "amber" : "green", text: result.message ?? "Message written — tweak anything you like, then save.", place: "message" });
      } else if (!result.ok) {
        setFeedback({ tone: "red", text: result.message, place: "message" });
      }
    });
  }

  function editMessage(setter: (v: string) => void, value: string) {
    setter(value);
    setSource("edited");
    setWrittenFrom(null);
  }

  function send(mode: "test" | "manual") {
    if (!contact) return;
    if (mode === "manual" && !window.confirm(`Send the birthday email to ${contact.name} (${contact.email}) right now?`)) return;
    const current: Greeting | null = body.trim()
      ? { subject: subject.trim() || `Happy Birthday, ${who}! 🎉`, headline: headline.trim() || `Happy Birthday, ${who}!`, message: body.trim(), source: "saved" }
      : null;
    setBusy(mode === "test" ? "test" : "send");
    setFeedback(null);
    startTransition(async () => {
      const result = await sendGreeting(contact.id, mode, template || null, current);
      setBusy(null);
      setFeedback({ tone: result.ok ? "green" : "red", text: result.message ?? (result.ok ? "Sent." : "Failed."), place: "send" });
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
      <form onSubmit={onSubmit} className="space-y-6">
        {contact && <input type="hidden" name="id" value={contact.id} />}
        <input type="hidden" name="template" value={template} />
        <input type="hidden" name="message_source" value={source || "edited"} />
        <input type="hidden" name="message_stale" value={stale ? "on" : ""} />
        {state?.message && <Notice tone="red">{state.message}</Notice>}

        <Card className="space-y-5 p-6">
          <h2 className="font-display text-xl font-semibold">Who are we celebrating?</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" htmlFor="name" error={errors?.name}>
              <input id="name" name="name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Ava Morgan" aria-invalid={!!errors?.name} />
            </Field>
            <Field label="Call them" htmlFor="nickname" hint="Optional — e.g. Mom, Avie, Dr. Morgan">
              <input id="nickname" name="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} className={inputClass} placeholder={firstName(name) || "Nickname"} />
            </Field>
          </div>
          <Field label="Their email" htmlFor="email" error={errors?.email}>
            <input id="email" name="email" type="email" required defaultValue={contact?.email} className={inputClass} placeholder="ava@example.com" aria-invalid={!!errors?.email} />
          </Field>
          <fieldset>
            <legend className="mb-1.5 block text-sm font-semibold">Birthday</legend>
            <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-3">
              <select aria-label="Month" name="birth_month" required value={month || ""} onChange={(e) => setMonth(Number(e.target.value))} className={inputClass} aria-invalid={!!errors?.birth_month}>
                <option value="" disabled>
                  Month
                </option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select aria-label="Day" name="birth_day" required value={day || ""} onChange={(e) => setDay(Number(e.target.value))} className={inputClass} aria-invalid={!!errors?.birth_day}>
                <option value="" disabled>
                  Day
                </option>
                {Array.from({ length: maxDay }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
              <input aria-label="Birth year (optional)" name="birth_year" inputMode="numeric" maxLength={4} value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))} className={inputClass} placeholder="Year (opt.)" aria-invalid={!!errors?.birth_year} />
            </div>
            {(errors?.birth_month || errors?.birth_day || errors?.birth_year) && (
              <p className="mt-1.5 text-sm text-red-600">{errors?.birth_month?.[0] ?? errors?.birth_day?.[0] ?? errors?.birth_year?.[0]}</p>
            )}
            {!errors && <p className="mt-1.5 text-sm text-muted">Year is optional — it lets us celebrate milestone birthdays. Feb 29 birthdays are celebrated on Feb 28 in other years.</p>}
          </fieldset>
        </Card>

        <Card className="space-y-5 p-6">
          <div>
            <h2 className="font-display text-xl font-semibold">Help the AI write it</h2>
            <p className="mt-1 text-sm text-muted">Tell Wishly about them in your own words — rough notes are perfect.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Relationship" htmlFor="relationship">
              <select id="relationship" name="relationship" value={relationship} onChange={(e) => setRelationship(e.target.value)} className={inputClass}>
                {RELATIONSHIPS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
            <fieldset>
              <legend className="mb-1.5 block text-sm font-semibold">Tone</legend>
              <div className="grid grid-cols-2 gap-2">
                {TONES.map((t) => (
                  <label
                    key={t.id}
                    title={t.hint}
                    className={cn(
                      "cursor-pointer rounded-xl border px-3 py-2 text-center text-sm font-medium transition-colors has-focus-visible:ring-2 has-focus-visible:ring-rose-300",
                      tone === t.id ? "border-rose-300 bg-rose-50 text-brand" : "border-line bg-white text-muted hover:border-stone-300",
                    )}
                  >
                    <input type="radio" name="tone" value={t.id} checked={tone === t.id} onChange={() => setTone(t.id)} className="sr-only" />
                    {t.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <Field label="About them" htmlFor="notes" hint="Who they are to you, what they love, recent news. e.g. “My best friend since college, loves hiking, just started a new job.”">
            <textarea id="notes" name="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} maxLength={1000} />
          </Field>
          <Field label="Anything you want to say? (optional)" htmlFor="custom_message" hint="Rough thoughts are fine — the AI weaves them into the message.">
            <textarea
              id="custom_message"
              name="custom_message"
              rows={3}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className={inputClass}
              maxLength={2000}
              placeholder="e.g. miss you, thanks for always being there even from far away, can't wait to catch up"
            />
          </Field>
        </Card>

        <Card className="space-y-5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
                The birthday message
                {body.trim() && <Badge tone={source === "ai" ? "rose" : "blue"}>{source === "ai" ? "Written by AI" : "Edited by you"}</Badge>}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {body.trim()
                  ? `This is exactly what ${who} receives${next ? ` on ${formatShortDate(next.date)}` : ""}. Edit anything, then save.`
                  : "Nothing written yet. Click “Write with AI” — or just save, and Wishly writes it for you."}
              </p>
            </div>
            <button type="button" onClick={writeWithAI} disabled={busy !== null} className={buttonClass("dark", "sm")}>
              {busy === "draft" ? <Spinner /> : <Icon name="sparkles" className="size-4" />}
              {body.trim() ? "Rewrite with AI" : "Write with AI"}
            </button>
          </div>

          {stale && (
            <Notice tone="amber">You changed the details above, so this message will be rewritten when you save. Click “Rewrite with AI” to see the new one first.</Notice>
          )}
          {feedback?.place === "message" && <Notice tone={feedback.tone}>{feedback.text}</Notice>}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Email subject" htmlFor="message_subject">
              <input id="message_subject" name="message_subject" value={subject} onChange={(e) => editMessage(setSubject, e.target.value)} maxLength={120} className={inputClass} placeholder={`Happy Birthday, ${who}! 🎉`} />
            </Field>
            <Field label="Headline" htmlFor="message_headline">
              <input id="message_headline" name="message_headline" value={headline} onChange={(e) => editMessage(setHeadline, e.target.value)} maxLength={80} className={inputClass} placeholder={`Happy Birthday, ${who}!`} />
            </Field>
          </div>
          <Field
            label="Message"
            htmlFor="message_body"
            hint={
              <>
                “Hi {who},” and your sign-off are added automatically. Placeholders: <code>{"{first_name}"}</code>, <code>{"{nickname}"}</code>, <code>{"{age}"}</code>.
              </>
            }
          >
            <textarea
              id="message_body"
              name="message_body"
              rows={8}
              value={body}
              onChange={(e) => editMessage(setBody, e.target.value)}
              maxLength={2000}
              className={inputClass}
              placeholder="Your birthday message appears here."
            />
          </Field>
        </Card>

        <Card className="space-y-4 p-6">
          <div>
            <h2 className="font-display text-xl font-semibold">Design</h2>
            <p className="mt-1 text-sm text-muted">Pick a template for {firstName(name) || "this person"}, or keep your default.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Email template">
            <TemplateChoice selected={template === ""} onSelect={() => setTemplate("")} title="My default" subtitle={getTemplate(sender.defaultTemplate).name} swatches={getTemplate(sender.defaultTemplate).swatches} />
            {TEMPLATES.map((t) => (
              <TemplateChoice key={t.id} selected={template === t.id} onSelect={() => setTemplate(t.id)} title={t.name} subtitle={t.bestFor} swatches={t.swatches} />
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-center gap-3">
            <input type="checkbox" name="enabled" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="size-5 accent-rose-600" />
            <span>
              <span className="block font-semibold">Send automatically on their birthday</span>
              <span className="block text-sm text-muted">Turn off to keep the reminder without emailing.</span>
            </span>
          </label>
          <div className="flex gap-2">
            <Link href="/contacts" className={buttonClass("secondary")}>
              Cancel
            </Link>
            <SubmitButton pending={pending} icon="check" pendingText={!body.trim() || stale ? "Saving & writing…" : "Saving…"}>
              {contact ? "Save changes" : "Save person"}
            </SubmitButton>
          </div>
        </Card>
      </form>

      <aside className="xl:sticky xl:top-8 xl:self-start">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Icon name="eye" className="size-4 text-brand" /> Live preview
            </div>
            <span className="text-xs font-medium text-muted">{body.trim() ? "Exactly what gets sent" : "No message yet"}</span>
          </div>
          {birthdayIsToday && enabled && (
            <div className="border-b border-line p-4">
              <Notice tone="amber">
                {sender.localHour >= sender.sendHour ? (
                  <>
                    Their birthday is today and your send time ({formatHour(sender.sendHour)}) has passed, so the email goes out about{" "}
                    <strong>10 minutes after you save</strong>. Check the preview first — or use Send now.
                  </>
                ) : (
                  <>Their birthday is today — this email goes out at {formatHour(sender.sendHour)}.</>
                )}
              </Notice>
            </div>
          )}
          <EmailFrame html={previewHtml} title="Email preview" scale={0.72} className="h-[560px] bg-stone-50" />
          <div className="space-y-3 border-t border-line p-4">
            {body.trim() && (
              <p className="text-sm">
                <span className="text-muted">Subject: </span>
                <span className="font-semibold">{subject.trim() || `Happy Birthday, ${who}! 🎉`}</span>
              </p>
            )}
            {feedback?.place === "send" && <Notice tone={feedback.tone}>{feedback.text}</Notice>}
            {contact ? (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => send("test")} disabled={busy !== null} className={buttonClass("secondary", "sm")}>
                  {busy === "test" ? <Spinner /> : <Icon name="mail" className="size-4" />} Send test to me
                </button>
                <button type="button" onClick={() => send("manual")} disabled={busy !== null} className={buttonClass("primary", "sm")}>
                  {busy === "send" ? <Spinner /> : <Icon name="send" className="size-4" />} Send now
                </button>
              </div>
            ) : (
              <p className="text-sm text-muted">Save this person to send yourself a test email.</p>
            )}
            <p className="text-xs text-muted">
              Sends from “{sender.name} &lt;no-reply@harakumo.com&gt;”. Replies go to {sender.replyEmail}. Tests go to {sender.email}.
            </p>
          </div>
        </Card>
      </aside>
    </div>
  );
}

function TemplateChoice({
  selected,
  onSelect,
  title,
  subtitle,
  swatches,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  subtitle: string;
  swatches: readonly string[];
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "cursor-pointer rounded-2xl border p-3 text-left transition-colors duration-200",
        selected ? "border-rose-400 bg-rose-50 ring-2 ring-rose-200" : "border-line bg-white hover:border-stone-300",
      )}
    >
      <span className="flex -space-x-1.5">
        {swatches.map((c, i) => (
          <span key={i} className="size-5 rounded-full ring-2 ring-white" style={{ background: c }} />
        ))}
      </span>
      <span className="mt-2 block text-sm font-semibold leading-tight">{title}</span>
      <span className="mt-0.5 block truncate text-xs text-muted">{subtitle}</span>
    </button>
  );
}
