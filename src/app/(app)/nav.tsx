"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/components/ui";

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/contacts", label: "People", icon: "users" },
  { href: "/templates", label: "Templates", icon: "palette" },
  { href: "/history", label: "History", icon: "history" },
  { href: "/settings", label: "Settings", icon: "sliders" },
];

export function AppNav({ orientation }: { orientation: "vertical" | "horizontal" }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className={cn(orientation === "vertical" ? "flex flex-col gap-1" : "flex gap-1 overflow-x-auto pb-1")}>
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors duration-200",
              active ? "bg-rose-50 text-brand" : "text-muted hover:bg-stone-100 hover:text-ink",
            )}
          >
            <Icon name={link.icon} className="size-[18px]" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
