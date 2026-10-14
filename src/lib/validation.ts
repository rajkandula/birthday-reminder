import * as z from "zod";

import { RELATIONSHIPS, TONES } from "./compose";
import { daysInMonth, isValidTimeZone } from "./dates";
import { TEMPLATES } from "./templates";

export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
} | undefined;

const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
const templateIds = TEMPLATES.map((t) => t.id) as [string, ...string[]];
const cleanName = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Keep it under ${max} characters.` })
    .transform((v) => v.replace(/[<>"@]/g, ""));

export const signupSchema = z.object({
  name: z.string().trim().min(2, { error: "Please enter your name." }).max(60),
  email: z.email({ error: "Please enter a valid email." }).trim().toLowerCase(),
  password: z.string().min(8, { error: "Use at least 8 characters." }).max(200),
  timezone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.email({ error: "Please enter a valid email." }).trim().toLowerCase(),
  password: z.string().min(1, { error: "Please enter your password." }),
});

export const contactSchema = z
  .object({
    id: z.coerce.number().int().positive().optional(),
    name: z.string().trim().min(1, { error: "Who is this for?" }).max(80),
    nickname: z.string().trim().max(40).default(""),
    email: z.email({ error: "Please enter a valid email." }).trim().toLowerCase(),
    birth_month: z.coerce.number().int().min(1, { error: "Pick a month." }).max(12),
    birth_day: z.coerce.number().int().min(1, { error: "Pick a day." }).max(31),
    birth_year: z.preprocess(
      (v) => (v === "" || v == null ? null : v),
      z.coerce
        .number()
        .int()
        .min(1900, { error: "Enter a 4-digit year." })
        .max(new Date().getFullYear(), { error: "That year is in the future." })
        .nullable(),
    ),
    relationship: z.enum(RELATIONSHIPS.map((r) => r.id) as [string, ...string[]]),
    tone: z.enum(TONES.map((t) => t.id) as [string, ...string[]]),
    notes: z.string().trim().max(1000).default(""),
    template: z.preprocess((v) => (v === "" || v == null ? null : v), z.enum(templateIds).nullable()),
    custom_message: z.string().trim().max(2000).default(""),
    message_subject: z.string().trim().max(120).default(""),
    message_headline: z.string().trim().max(80).default(""),
    message_body: z.string().trim().max(2000).default(""),
    message_source: z.preprocess((v) => (v === "ai" || v === "edited" ? v : "edited"), z.enum(["ai", "edited"])),
    /** The AI-written message no longer matches the details above and should be rewritten on save. */
    message_stale: checkbox,
    enabled: checkbox,
  })
  .refine((c) => c.birth_day <= daysInMonth(c.birth_month, 2024), {
    error: "That day doesn't exist in this month.",
    path: ["birth_day"],
  });

export const settingsSchema = z.object({
  name: z.string().trim().min(2, { error: "Please enter your name." }).max(60),
  sender_name: cleanName(64).refine((v) => !/^harakumo/i.test(v), { error: "Please choose a different sender name." }),
  reply_email: z.union([z.literal(""), z.email({ error: "Please enter a valid email." }).trim().toLowerCase()]),
  signature: z.string().trim().max(200).default(""),
  timezone: z.string().refine(isValidTimeZone, { error: "Unknown timezone." }),
  send_hour: z.coerce.number().int().min(0).max(23),
  default_template: z.enum(templateIds),
  ai_enabled: checkbox,
  notify_self: checkbox,
});

export const draftSchema = z.object({
  name: z.string().trim().min(1).max(80),
  nickname: z.string().trim().max(40),
  relationship: z.enum(RELATIONSHIPS.map((r) => r.id) as [string, ...string[]]),
  tone: z.enum(TONES.map((t) => t.id) as [string, ...string[]]),
  notes: z.string().trim().max(1000),
  custom_message: z.string().trim().max(2000),
  birth_month: z.number().int().min(1).max(12),
  birth_day: z.number().int().min(1).max(31),
  birth_year: z.number().int().min(1900).max(new Date().getFullYear()).nullable(),
});

export const greetingSchema = z.object({
  subject: z.string().trim().min(1).max(120),
  headline: z.string().trim().min(1).max(80),
  message: z.string().trim().min(1).max(2000),
  source: z.enum(["saved", "custom", "ai", "fallback"]),
});

export function fieldErrors(error: z.ZodError): Record<string, string[] | undefined> {
  return z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
}
