import type { Metadata } from "next";
import Link from "next/link";

import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/ui";

import { ImportForm } from "./import-form";

export const metadata: Metadata = { title: "Import people" };

export default function ImportPage() {
  return (
    <>
      <Link href="/contacts" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <Icon name="chevronLeft" className="size-4" /> People
      </Link>
      <PageHeader
        title="Import people"
        description="Paste a list from a spreadsheet or your notes — one person per line. You can fine-tune tone, notes and templates afterwards."
      />
      <ImportForm />
    </>
  );
}
