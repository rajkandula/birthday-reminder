import type { Metadata } from "next";

import { LoginForm } from "../auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="font-display text-4xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mb-8 mt-2 text-muted">Sign in to see who&apos;s celebrating next.</p>
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </>
  );
}
