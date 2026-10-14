import Link from "next/link";

import { EmailFrame } from "@/components/client";
import { Icon, type IconName } from "@/components/icons";
import { Logo } from "@/components/logo";
import { ButtonLink, Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";
import { SAMPLE_CONTENT, TEMPLATES, renderEmail } from "@/lib/templates";

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: "sparkles", title: "Written for them, every year", body: "Add a few notes — their hobbies, recent news, how you know them — and AI writes a fresh, personal message in the tone you choose." },
  { icon: "palette", title: "Designs worth opening", body: "Six polished templates, from bold confetti to understated professional. Pick one per person or set a default." },
  { icon: "globe", title: "Right on time, in your timezone", body: "Emails go out on the morning of the birthday in your timezone. Feb 29 birthdays are handled too." },
  { icon: "mail", title: "From you, replies to you", body: "Recipients see your name as the sender, and every email has a reply button that goes straight to your inbox." },
  { icon: "bell", title: "A nudge for you, too", body: "Get a copy the moment a wish is sent, so you can follow up with a call or a message." },
  { icon: "upload", title: "Set up in minutes", body: "Paste your list from a spreadsheet, send yourself a test, and never think about it again." },
];

export default async function HomePage() {
  const user = await getCurrentUser().catch(() => null);
  const hero = renderEmail("confetti", SAMPLE_CONTENT).html;
  const heroBack = renderEmail("midnight", { ...SAMPLE_CONTENT, recipientName: "Maya", headline: "Happy Birthday, Maya" }).html;

  return (
    <div className="overflow-x-hidden">
      <header className="sticky top-0 z-30 border-b border-transparent bg-canvas/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Logo />
          <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
            <a href="#how" className="hidden rounded-full px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-ink sm:block">
              How it works
            </a>
            <a href="#templates" className="hidden rounded-full px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-ink sm:block">
              Templates
            </a>
            {user ? (
              <ButtonLink href="/dashboard" size="sm" variant="dark">
                Open dashboard
              </ButtonLink>
            ) : (
              <>
                <Link href="/login" className="rounded-full px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-stone-100">
                  Sign in
                </Link>
                <ButtonLink href="/signup" size="sm">
                  Get started
                </ButtonLink>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="relative">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 h-[640px] bg-[radial-gradient(60%_50%_at_70%_30%,#fecdd3_0%,transparent_70%),radial-gradient(40%_40%_at_20%_60%,#fed7aa_0%,transparent_70%)] opacity-70" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-12 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
            <div className="animate-float-up">
              <p className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/80 px-3 py-1 text-sm font-semibold text-brand">
                <Icon name="cake" className="size-4" /> Birthday emails on autopilot
              </p>
              <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
                Never miss
                <br />
                another <span className="italic text-brand">birthday.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
                Life gets busy. Save the birthdays of your family, friends and colleagues once — Wishly writes a warm, personal email and sends it
                from you, right on the day.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href={user ? "/dashboard" : "/signup"} size="lg" icon="gift">
                  {user ? "Go to dashboard" : "Start free"}
                </ButtonLink>
                <ButtonLink href="#templates" size="lg" variant="secondary">
                  See the templates
                </ButtonLink>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
                {["Sent in your name", "AI-personalised", "Timezone-aware"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Icon name="check" className="size-4 text-emerald-600" /> {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative mx-auto h-[520px] w-full max-w-[460px]" aria-label="Example birthday emails">
              <div className="absolute right-0 top-6 w-[78%] rotate-6 overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-stone-200">
                <EmailFrame html={heroBack} title="Midnight Gold template example" scale={0.52} className="h-[440px]" />
              </div>
              <div className="absolute left-0 top-0 w-[82%] -rotate-3 overflow-hidden rounded-3xl bg-white shadow-2xl shadow-rose-200/70 ring-1 ring-rose-100">
                <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-2.5 text-xs text-muted">
                  <span className="size-2 rounded-full bg-rose-300" />
                  <span className="size-2 rounded-full bg-amber-300" />
                  <span className="size-2 rounded-full bg-emerald-300" />
                  <span className="ml-1 truncate">Jordan · Happy Birthday, Alex! 🎉</span>
                </div>
                <EmailFrame html={hero} title="Confetti Pop template example" scale={0.58} className="h-[470px]" />
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="scroll-mt-20 border-y border-line bg-white py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-center font-display text-4xl font-semibold tracking-tight">Three minutes to set up. Years of remembering.</h2>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                { n: "1", title: "Add your people", body: "Name, email and birthday. Import a whole list at once if you like.", icon: "users" as const },
                { n: "2", title: "Choose the vibe", body: "Pick a design and tone per person, and jot a few notes for the AI.", icon: "palette" as const },
                { n: "3", title: "Wishly does the rest", body: "On their birthday, a personal email goes out from you. You get a heads-up.", icon: "send" as const },
              ].map((step) => (
                <Card key={step.n} className="relative p-7">
                  <span className="absolute right-6 top-5 font-display text-5xl font-semibold text-rose-100">{step.n}</span>
                  <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-brand">
                    <Icon name={step.icon} className="size-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-muted">{step.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="templates" className="scroll-mt-20 py-20">
          <div className="mx-auto max-w-6xl px-5">
            <div className="max-w-2xl">
              <h2 className="font-display text-4xl font-semibold tracking-tight">A design for every relationship</h2>
              <p className="mt-3 text-lg text-muted">Playful for your best friend, elegant for your partner, polished for your clients.</p>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {TEMPLATES.map((t) => (
                <Card key={t.id} className="overflow-hidden">
                  <EmailFrame html={t.render(SAMPLE_CONTENT)} title={`${t.name} template`} scale={0.5} className="h-[300px] border-b border-line" />
                  <div className="p-5">
                    <h3 className="font-semibold">{t.name}</h3>
                    <p className="mt-1 text-sm text-muted">{t.bestFor}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-line bg-white py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="max-w-2xl font-display text-4xl font-semibold tracking-tight">Thoughtful, without the effort</h2>
            <div className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title}>
                  <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                    <Icon name={f.icon} className="size-5" />
                  </span>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-20">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-linear-to-br from-rose-600 via-rose-500 to-orange-400 px-8 py-14 text-center text-white shadow-xl shadow-rose-200 sm:px-16">
            <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Make someone&apos;s day. Every year.</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-rose-50">Add the people who matter today — Wishly will remember for you.</p>
            <Link
              href={user ? "/contacts/new" : "/signup"}
              className="mt-8 inline-flex h-13 cursor-pointer items-center gap-2 rounded-full bg-white px-8 font-semibold text-rose-600 transition-colors hover:bg-rose-50"
            >
              {user ? "Add a person" : "Create your free account"} <Icon name="arrowRight" className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-sm text-muted sm:flex-row">
          <Logo />
          <p>Built on Harakumo · © {new Date().getFullYear()} Wishly</p>
        </div>
      </footer>
    </div>
  );
}
