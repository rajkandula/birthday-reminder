import type { Metadata } from "next";

import { setDefaultTemplate } from "@/app/actions/settings";
import { EmailFrame, SubmitButton } from "@/components/client";
import { Icon } from "@/components/icons";
import { Badge, Card, Notice, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { TEMPLATES, SAMPLE_CONTENT } from "@/lib/templates";

export const metadata: Metadata = { title: "Templates" };

export default async function TemplatesPage({ searchParams }: PageProps<"/templates">) {
  const user = await requireUser();
  const { default: changed } = await searchParams;
  const sample = {
    ...SAMPLE_CONTENT,
    senderName: user.sender_name || user.name,
    signature: user.signature || SAMPLE_CONTENT.signature,
    replyEmail: user.reply_email || user.email,
  };

  return (
    <>
      <PageHeader
        title="Email templates"
        description="Every template uses responsive, email-safe HTML. Set a default here, or choose one per person."
      />
      {changed && (
        <div className="mb-6">
          <Notice>Default template updated. People without their own template will use it.</Notice>
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {TEMPLATES.map((t) => {
          const isDefault = t.id === user.default_template;
          return (
            <Card key={t.id} className={isDefault ? "overflow-hidden ring-2 ring-rose-300" : "overflow-hidden"}>
              <EmailFrame html={t.render(sample)} title={`${t.name} preview`} scale={0.55} className="h-[380px] border-b border-line bg-stone-50" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-semibold">{t.name}</h2>
                    <p className="mt-1 text-sm text-muted">{t.description}</p>
                  </div>
                  <span className="flex shrink-0 -space-x-1.5 pt-1">
                    {t.swatches.map((c) => (
                      <span key={c} className="size-5 rounded-full ring-2 ring-white" style={{ background: c }} />
                    ))}
                  </span>
                </div>
                <p className="mt-3 text-sm">
                  <span className="font-semibold">Best for:</span> <span className="text-muted">{t.bestFor}</span>
                </p>
                <div className="mt-4">
                  {isDefault ? (
                    <Badge tone="rose">
                      <Icon name="check" className="size-3.5" /> Your default
                    </Badge>
                  ) : (
                    <form action={setDefaultTemplate}>
                      <input type="hidden" name="template" value={t.id} />
                      <SubmitButton variant="secondary" size="sm" pendingText="Updating…">
                        Use as default
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
