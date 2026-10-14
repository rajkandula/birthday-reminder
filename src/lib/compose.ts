import type { Contact, User } from "./db";
import type { Harakumo } from "./harakumo";
import { firstName } from "./templates/shared";
import type { EmailContent } from "./templates";

export const RELATIONSHIPS = [
  { id: "family", label: "Family" },
  { id: "partner", label: "Partner" },
  { id: "friend", label: "Friend" },
  { id: "colleague", label: "Colleague" },
  { id: "client", label: "Client" },
  { id: "other", label: "Other" },
] as const;

export const TONES = [
  { id: "warm", label: "Warm", hint: "Friendly and kind" },
  { id: "playful", label: "Playful", hint: "Fun, light jokes" },
  { id: "heartfelt", label: "Heartfelt", hint: "Emotional and personal" },
  { id: "professional", label: "Professional", hint: "Polished and respectful" },
] as const;

export type GreetingSource = "saved" | "custom" | "ai" | "fallback";

export type Greeting = {
  subject: string;
  headline: string;
  message: string;
  source: GreetingSource;
};

const PERSONAL = new Set(["family", "partner", "friend"]);

export function recipientName(contact: Pick<Contact, "name" | "nickname">): string {
  return contact.nickname.trim() || firstName(contact.name);
}

export function senderName(user: Pick<User, "sender_name" | "name">): string {
  return user.sender_name.trim() || user.name;
}

export function fillPlaceholders(
  textValue: string,
  values: { name: string; nickname: string; turning: number | null; sender: string },
): string {
  return textValue
    .replace(/\{first_name\}/gi, firstName(values.name))
    .replace(/\{nickname\}/gi, values.nickname.trim() || firstName(values.name))
    .replace(/\{name\}/gi, values.name)
    .replace(/\{age\}/gi, values.turning ? String(values.turning) : "")
    .replace(/\{sender\}/gi, values.sender);
}

export function applyPlaceholders(textValue: string, contact: Contact, user: User, turning: number | null): string {
  return fillPlaceholders(textValue, { name: contact.name, nickname: contact.nickname, turning, sender: senderName(user) });
}

function fallbackGreeting(contact: Contact, turning: number | null, variantSeed: number): Omit<Greeting, "source"> {
  const who = recipientName(contact);
  const milestone = turning && PERSONAL.has(contact.relationship) ? ` Happy ${turning}!` : "";
  const byTone: Record<string, string[]> = {
    warm: [
      `Wishing you a wonderful birthday filled with the people and things you love most.${milestone}\n\nI hope the year ahead brings you good health, plenty of laughter and lots of reasons to celebrate. Enjoy every moment of your day!`,
      `Happy birthday! I hope today is as bright and kind as you are.${milestone}\n\nMay this new year bring you exciting adventures, calm moments and everything you've been hoping for.`,
    ],
    playful: [
      `Another year older, and somehow still getting cooler. How do you do it?${milestone}\n\nHope your day is full of cake, zero responsibilities and at least one great surprise. Go celebrate like you mean it!`,
      `Official announcement: today is all about you. Cake is mandatory, fun is non-negotiable.${milestone}\n\nHave the best birthday and an even better year ahead!`,
    ],
    heartfelt: [
      `On your birthday I just want you to know how grateful I am to have you in my life.${milestone}\n\nYou make the people around you feel seen and loved. I hope this year gives back even a little of the joy you bring to others.`,
      `Some people make life warmer just by being in it, and you're one of them.${milestone}\n\nWishing you a birthday full of love and a year full of moments that make your heart happy.`,
    ],
    professional: [
      `Wishing you a very happy birthday. I hope you're able to take a moment today to celebrate and enjoy time with the people who matter most.\n\nAll the best for a healthy, rewarding and successful year ahead.`,
      `On behalf of all our work together, happy birthday! It's a pleasure working with you.\n\nWishing you a great day and continued success in the year ahead.`,
    ],
  };
  const options = byTone[contact.tone] ?? byTone.warm;
  return {
    subject: contact.tone === "professional" ? `Happy Birthday, ${who}` : `Happy Birthday, ${who}! 🎉`,
    headline: `Happy Birthday, ${who}!`,
    message: options[variantSeed % options.length],
  };
}

function buildPrompt(contact: Contact, user: User, turning: number | null): string {
  const mentionAge = turning && PERSONAL.has(contact.relationship) && turning % 5 === 0;
  return [
    "You write a short birthday email on behalf of a real person. Write in first person as the sender.",
    "",
    `Sender: ${senderName(user)}`,
    `Recipient full name: ${contact.name}`,
    `Address them as: ${recipientName(contact)}`,
    `Relationship to sender: ${contact.relationship}`,
    `Tone: ${contact.tone}`,
    mentionAge ? `They are turning ${turning} (a milestone — you may mention it).` : "Do not mention their age.",
    contact.notes.trim()
      ? `What the sender knows about them (use naturally, don't list): ${contact.notes.trim().slice(0, 800)}`
      : "No extra details are known — keep it sincere and general.",
    contact.custom_message.trim()
      ? `What the sender wants to say, in their own rough words: "${contact.custom_message.trim().slice(0, 1200)}". Turn this into a well-written, heartfelt message: keep every idea and feeling, fix grammar and flow, and do not copy it word-for-word.`
      : "",
    "",
    "Rules:",
    "- 55 to 110 words, 2 short paragraphs separated by a blank line.",
    "- Do NOT start with a greeting line (\"Hi X,\" is added by the template) and do NOT add a sign-off or signature.",
    "- No placeholders, brackets, hashtags or markdown. Never mention AI.",
    "- Only use details from the notes above. Do not invent shared memories, habits or events.",
    `- Subject: under 60 characters, uses "${recipientName(contact)}", may include one emoji unless the tone is professional.`,
    `- Headline: a celebratory line of at most 6 words that includes "${recipientName(contact)}" (not their full name).`,
    "",
    'Respond with ONLY a JSON object: {"subject": "...", "headline": "...", "message": "..."}',
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");
}

function parseGreeting(output: string): Omit<Greeting, "source"> | null {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const data = JSON.parse(output.slice(start, end + 1)) as Record<string, unknown>;
    const subject = typeof data.subject === "string" ? data.subject.trim() : "";
    const headline = typeof data.headline === "string" ? data.headline.trim() : "";
    const message = typeof data.message === "string" ? data.message.trim() : "";
    if (!subject || !headline || message.length < 40 || /[[\]{}]/.test(message)) return null;
    return { subject: subject.slice(0, 120), headline: headline.slice(0, 80), message: message.slice(0, 2000) };
  } catch {
    return null;
  }
}

export async function composeGreeting(
  hk: Harakumo,
  contact: Contact,
  user: User,
  turning: number | null,
  /** requireAI: throw instead of falling back when the AI can't write it (the dispatcher retries later). */
  opts: { useAI?: boolean; requireAI?: boolean } = {},
): Promise<Greeting> {
  const seed = contact.id + new Date().getUTCFullYear();
  const useAI = opts.useAI ?? Boolean(user.ai_enabled);

  if (useAI) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { output } = await hk.generate(buildPrompt(contact, user, turning));
        const parsed = parseGreeting(output ?? "");
        if (parsed) return { ...parsed, source: "ai" };
      } catch {
        // AI gateway unavailable or over the monthly cap.
      }
    }
    if (opts.requireAI) throw new Error("The AI writer is unavailable right now — Wishly will retry shortly.");
  }
  // Never send rough notes as a finished email: use the built-in message instead.
  return { ...fallbackGreeting(contact, turning, seed), source: "fallback" };
}

/** The message saved on the contact, if it was written for the birthday in `year`. */
export function savedGreeting(contact: Contact, user: User, turning: number | null, year: number): Greeting | null {
  if (!contact.message_body.trim() || contact.message_year !== year) return null;
  const who = recipientName(contact);
  const fill = (text: string) => applyPlaceholders(text, contact, user, turning);
  return {
    subject: fill(contact.message_subject.trim()) || `Happy Birthday, ${who}! 🎉`,
    headline: fill(contact.message_headline.trim()) || `Happy Birthday, ${who}!`,
    message: fill(contact.message_body.trim()),
    source: "saved",
  };
}

export function toEmailContent(greeting: Greeting, contact: Contact, user: User, turning: number | null): EmailContent {
  return {
    recipientName: recipientName(contact),
    headline: greeting.headline,
    message: greeting.message,
    senderName: senderName(user),
    signature: user.signature,
    replyEmail: user.reply_email.trim() || user.email,
    turning: turning && PERSONAL.has(contact.relationship) ? turning : null,
  };
}
