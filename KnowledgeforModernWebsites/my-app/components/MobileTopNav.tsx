import Link from "next/link";

import { KMW_SITE } from "@/lib/kmwNav";

export default function MobileTopNav() {
  return (
    <header className="sticky top-0 z-10 border-b border-foreground/10 bg-background/80 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="leading-tight">
          <div className="text-base font-semibold tracking-tight">{KMW_SITE.name}</div>
          <div className="text-xs text-foreground/70">{KMW_SITE.fullName}</div>
        </Link>
      </div>
    </header>
  );
}
