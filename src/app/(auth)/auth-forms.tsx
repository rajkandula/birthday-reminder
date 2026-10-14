"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { login, signup } from "@/app/actions/auth";
import { SubmitButton, useFormAction } from "@/components/client";
import { Field, Notice, inputClass } from "@/components/ui";

export function SignupForm() {
  const { state, onSubmit, pending } = useFormAction(signup, undefined);
  const [timezone, setTimezone] = useState("UTC");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only value
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  }, []);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <input type="hidden" name="timezone" value={timezone} />
      {state?.message && <Notice tone="red">{state.message}</Notice>}
      <Field label="Your name" htmlFor="name" error={state?.errors?.name} hint="This is how your emails will be signed.">
        <input id="name" name="name" autoComplete="name" required className={inputClass} placeholder="Jordan Lee" aria-invalid={!!state?.errors?.name} />
      </Field>
      <Field label="Email" htmlFor="email" error={state?.errors?.email}>
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} placeholder="you@example.com" aria-invalid={!!state?.errors?.email} />
      </Field>
      <Field label="Password" htmlFor="password" error={state?.errors?.password} hint="At least 8 characters.">
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className={inputClass} aria-invalid={!!state?.errors?.password} />
      </Field>
      <SubmitButton pending={pending} pendingText="Creating your account…" className="w-full">
        Create free account
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const { state, onSubmit, pending } = useFormAction(login, undefined);
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {next && <input type="hidden" name="next" value={next} />}
      {state?.message && <Notice tone="red">{state.message}</Notice>}
      <Field label="Email" htmlFor="email" error={state?.errors?.email}>
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} placeholder="you@example.com" />
      </Field>
      <Field label="Password" htmlFor="password" error={state?.errors?.password}>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      <SubmitButton pending={pending} pendingText="Signing in…" className="w-full">
        Sign in
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        New to Wishly?{" "}
        <Link href="/signup" className="font-semibold text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
