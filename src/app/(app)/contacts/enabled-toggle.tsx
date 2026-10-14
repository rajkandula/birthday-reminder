"use client";

import { useOptimistic, useTransition } from "react";

import { toggleContact } from "@/app/actions/contacts";
import { cn } from "@/components/ui";

export function EnabledToggle({ id, enabled, name }: { id: number; enabled: boolean; name: string }) {
  const [optimistic, setOptimistic] = useOptimistic(enabled);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={optimistic}
      aria-label={`Auto-send for ${name}`}
      title={optimistic ? "Auto-send on" : "Auto-send off"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic);
          await toggleContact(id, !optimistic);
        })
      }
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200",
        optimistic ? "bg-brand" : "bg-stone-300",
      )}
    >
      <span className={cn("inline-block size-5 rounded-full bg-white shadow transition-transform duration-200", optimistic ? "translate-x-6" : "translate-x-1")} />
    </button>
  );
}
