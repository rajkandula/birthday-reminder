import Link from "next/link";

import { Icon } from "./icons";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 rounded-xl" aria-label="Wishly home">
      <span className="inline-flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-rose-500 to-orange-400 text-white shadow-sm shadow-rose-200">
        <Icon name="gift" className="size-5" />
      </span>
      <span className="font-display text-2xl font-semibold tracking-tight text-ink">Wishly</span>
    </Link>
  );
}
