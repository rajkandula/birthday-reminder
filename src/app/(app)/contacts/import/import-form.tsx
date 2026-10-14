"use client";

import { importContacts } from "@/app/actions/contacts";
import { SubmitButton, useFormAction } from "@/components/client";
import { Card, Notice, inputClass } from "@/components/ui";

const EXAMPLE = `Mom, mom@example.com, 1970-06-01, family
Sam Carter, sam@example.com, 07-04, friend
Lena Brooks, lena@example.com, 9/12/1991, colleague
Theo Park, theo@example.com, December 2, client`;

export function ImportForm() {
  const { state, onSubmit, pending } = useFormAction(importContacts, undefined);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          {state?.message && <Notice tone={state.ok ? "amber" : "red"}>{state.message}</Notice>}
          <label htmlFor="rows" className="block text-sm font-semibold">
            Name, email, birthday, relationship
          </label>
          <textarea id="rows" name="rows" rows={12} required placeholder={EXAMPLE} className={`${inputClass} font-mono text-sm`} />
          <SubmitButton pending={pending} icon="upload" pendingText="Importing…">
            Import people
          </SubmitButton>
        </form>
      </Card>
      <Card className="p-6 text-sm">
        <h2 className="font-semibold">Accepted formats</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted">
          <li>Separate columns with commas, semicolons or tabs (copy straight from Google Sheets or Excel).</li>
          <li>
            Birthdays: <code>1990-06-21</code>, <code>06-21</code>, <code>21/06/1990</code> or <code>June 21</code>.
          </li>
          <li>Relationship (optional): family, partner, friend, colleague, client or other.</li>
          <li>Colleagues and clients get a professional tone; everyone else gets warm.</li>
          <li>Up to 300 people at a time. A header row is skipped automatically.</li>
        </ul>
      </Card>
    </div>
  );
}
