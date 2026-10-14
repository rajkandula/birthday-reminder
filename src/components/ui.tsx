import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { Icon, type IconName } from "./icons";

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

type Variant = "primary" | "dark" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export function buttonClass(variant: Variant = "primary", size: Size = "md"): string {
  const base =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap";
  const sizes: Record<Size, string> = {
    sm: "h-9 px-3.5 text-sm",
    md: "h-11 px-5 text-[15px]",
    lg: "h-13 px-7 text-base",
  };
  const variants: Record<Variant, string> = {
    primary: "bg-brand text-white hover:bg-brand-dark shadow-sm shadow-rose-200",
    dark: "bg-ink text-white hover:bg-stone-700",
    secondary: "bg-white text-ink border border-line hover:border-stone-300 hover:bg-stone-50",
    ghost: "text-muted hover:bg-stone-100 hover:text-ink",
    danger: "bg-white text-red-700 border border-red-200 hover:bg-red-50",
  };
  return cn(base, sizes[size], variants[variant]);
}

export function ButtonLink({
  href,
  variant,
  size,
  icon,
  children,
  className,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn(buttonClass(variant, size), className)}>
      {icon && <Icon name={icon} className="size-4" />}
      {children}
    </Link>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-3xl border border-line bg-white", className)} {...props} />;
}

export function Badge({ tone = "stone", children }: { tone?: "stone" | "rose" | "green" | "amber" | "blue" | "red"; children: ReactNode }) {
  const tones = {
    stone: "bg-stone-100 text-stone-700",
    rose: "bg-rose-50 text-rose-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-800",
    blue: "bg-sky-50 text-sky-700",
    red: "bg-red-50 text-red-700",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone])}>{children}</span>;
}

export const inputClass =
  "block w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink placeholder:text-stone-400 transition-colors focus:border-rose-400 focus:outline-none focus:ring-4 focus:ring-rose-100 aria-[invalid=true]:border-red-400";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {error?.length ? (
        <p className="mt-1.5 text-sm text-red-600" role="alert">
          {error[0]}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Notice({ tone = "green", children }: { tone?: "green" | "red" | "amber" | "rose"; children: ReactNode }) {
  const tones = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    red: "border-red-200 bg-red-50 text-red-800",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
  };
  return (
    <div role="status" className={cn("flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm", tones[tone])}>
      <Icon name={tone === "red" ? "alert" : tone === "amber" ? "bell" : "check"} className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const palette = ["bg-rose-100 text-rose-700", "bg-amber-100 text-amber-800", "bg-sky-100 text-sky-700", "bg-emerald-100 text-emerald-700", "bg-violet-100 text-violet-700", "bg-orange-100 text-orange-700"];
  const hash = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span className={cn("inline-flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold", palette[hash % palette.length], className)}>
      {initials || "?"}
    </span>
  );
}
