import type { Metadata } from "next";

import { SignupForm } from "../auth-forms";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <>
      <h1 className="font-display text-4xl font-semibold tracking-tight">Never forget a birthday again</h1>
      <p className="mb-8 mt-2 text-muted">Add your people once. Wishly remembers and sends the wishes for you.</p>
      <SignupForm />
    </>
  );
}
