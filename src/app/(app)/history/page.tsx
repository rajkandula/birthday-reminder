import type { Metadata } from "next";
import Link from "next/link";

import { Badge, Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { listSends } from "@/lib/db";
import { hk } from "@/lib/server";
import { getTemplate } from "@/lib/templates";

export const metadata: Metadata = { title: "History" };

const SOURCE_LABEL: Record<string, string> = { saved: "Saved message", ai: "AI-written", custom: "Your exact words", fallback: "Built-in" };

export default async function HistoryPage() {
  const user = await requireUser();
  const sends = await listSends(hk(), user.id, 200);
  const fmt = (sqlDate: string) =>
    new Date(`${sqlDate.replace(" ", "T")}Z`).toLocaleString("en-US", { timeZone: user.timezone, dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <PageHeader title="History" description="Every birthday email Wishly has sent (or tried to) for you, newest first." />
      <Card className="overflow-hidden">
        {sends.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-semibold">No emails yet</p>
            <p className="mt-1 text-sm text-muted">When a birthday comes around — or you send a test — it&apos;ll show up here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {sends.map((s) => {
              const stale = s.status === "pending" && s.age_minutes > 15;
              return (
                <li key={s.id}>
                  <details className="group">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-stone-50">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{s.subject || (s.status === "failed" ? "Not sent" : "Sending…")}</p>
                        <p className="truncate text-sm text-muted">
                          {s.contact_id && s.contact_name ? (
                            <Link href={`/contacts/${s.contact_id}`} className="hover:underline">
                              {s.contact_name}
                            </Link>
                          ) : (
                            "Deleted person"
                          )}{" "}
                          · {s.to_email} · {fmt(s.sent_at ?? s.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone={s.kind === "auto" ? "blue" : "stone"}>{s.kind === "auto" ? "Automatic" : s.kind === "test" ? "Test" : "Manual"}</Badge>
                        {s.source && <Badge>{SOURCE_LABEL[s.source] ?? s.source}</Badge>}
                        <Badge tone={s.status === "sent" ? "green" : s.status === "failed" || stale ? "red" : "amber"}>
                          {stale ? "interrupted" : s.status}
                        </Badge>
                      </div>
                    </summary>
                    <div className="space-y-2 bg-stone-50/60 px-5 pb-5 pt-1 text-sm">
                      {s.error && <p className="text-red-700">Error: {s.error}</p>}
                      {s.template && <p className="text-muted">Template: {getTemplate(s.template).name}</p>}
                      {s.message ? <p className="whitespace-pre-line leading-relaxed">{s.message}</p> : <p className="text-muted">No message stored.</p>}
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
