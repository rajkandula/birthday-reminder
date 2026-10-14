"use client";

import type { ReactNode } from "react";

/** Asks for confirmation before the wrapped submit button's form is submitted. */
export function ConfirmDelete({ name, children }: { name: string; children: ReactNode }) {
  return (
    <span
      onClickCapture={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("button[type=submit]") && !window.confirm(`Delete ${name}? This can't be undone.`)) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      {children}
    </span>
  );
}
