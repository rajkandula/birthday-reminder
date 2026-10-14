"use client";

import { type FormEvent, type ReactNode, useActionState, useTransition } from "react";
import { useFormStatus } from "react-dom";

import { Icon, type IconName } from "./icons";
import { buttonClass, cn } from "./ui";

export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  size = "md",
  icon,
  className,
  pending: pendingProp,
}: {
  children: ReactNode;
  pending?: boolean;
  pendingText?: string;
  variant?: Parameters<typeof buttonClass>[0];
  size?: Parameters<typeof buttonClass>[1];
  icon?: IconName;
  className?: string;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={cn(buttonClass(variant, size), className)}>
      {pending ? <Spinner /> : icon ? <Icon name={icon} className="size-4" /> : null}
      {pending ? (pendingText ?? "Saving…") : children}
    </button>
  );
}

/**
 * Like useActionState, but submits via onSubmit so React doesn't reset the form's fields
 * after the action — users keep what they typed when validation fails.
 */
export function useFormAction<S>(action: (state: Awaited<S>, formData: FormData) => Promise<S>, initial: Awaited<S>) {
  const [state, dispatch, pending] = useActionState(action, initial);
  const [transitionPending, startTransition] = useTransition();
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };
  return { state, onSubmit, pending: pending || transitionPending };
}

export function Spinner({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Renders an email's HTML in a sandboxed iframe. `scale` shrinks it into thumbnails. */
export function EmailFrame({ html, title, scale = 1, className }: { html: string; title: string; scale?: number; className?: string }) {
  if (scale === 1) {
    return <iframe title={title} srcDoc={html} sandbox="" className={cn("h-full w-full border-0 bg-white", className)} />;
  }
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <iframe
        title={title}
        srcDoc={html}
        sandbox=""
        tabIndex={-1}
        className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
        style={{ width: `${100 / scale}%`, height: `${100 / scale}%`, transform: `scale(${scale})` }}
      />
    </div>
  );
}
