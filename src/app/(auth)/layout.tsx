import { EmailFrame } from "@/components/client";
import { Logo } from "@/components/logo";
import { renderEmail, SAMPLE_CONTENT } from "@/lib/templates";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { html } = renderEmail("confetti", SAMPLE_CONTENT);
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">{children}</div>
      </div>
      <div className="relative hidden overflow-hidden bg-linear-to-br from-rose-100 via-orange-50 to-amber-100 lg:block">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12">
          <div className="w-full max-w-md rotate-2 overflow-hidden rounded-3xl bg-white shadow-2xl shadow-rose-200/60 ring-1 ring-rose-100">
            <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-3 text-xs text-muted">
              <span className="size-2.5 rounded-full bg-rose-300" />
              <span className="size-2.5 rounded-full bg-amber-300" />
              <span className="size-2.5 rounded-full bg-emerald-300" />
              <span className="ml-2 truncate">Happy Birthday, Alex! 🎉 — from Jordan</span>
            </div>
            <EmailFrame html={html} title="Example birthday email" scale={0.62} className="h-[520px]" />
          </div>
          <p className="mt-10 max-w-sm text-center font-display text-2xl text-rose-950">
            Add them once. Wishly remembers every year.
          </p>
        </div>
      </div>
    </div>
  );
}
