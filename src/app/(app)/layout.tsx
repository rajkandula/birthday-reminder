import { logout } from "@/app/actions/auth";
import { Icon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { Avatar, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";

import { AppNav } from "./nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-white/70 px-4 py-6 backdrop-blur lg:flex">
        <div className="px-2">
          <Logo href="/dashboard" />
        </div>
        <div className="mt-10 flex-1">
          <AppNav orientation="vertical" />
        </div>
        <div className="rounded-2xl border border-line bg-white p-3">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} className="size-9 rounded-xl text-xs" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
            <form action={logout}>
              <button type="submit" className={buttonClass("ghost", "sm")} aria-label="Sign out" title="Sign out">
                <Icon name="logOut" className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-line bg-white/85 px-4 pt-3 backdrop-blur lg:hidden">
        <div className="mb-2 flex items-center justify-between">
          <Logo href="/dashboard" />
          <form action={logout}>
            <button type="submit" className={buttonClass("ghost", "sm")}>
              <Icon name="logOut" className="size-4" /> Sign out
            </button>
          </form>
        </div>
        <AppNav orientation="horizontal" />
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 lg:py-12">{children}</main>
    </div>
  );
}
