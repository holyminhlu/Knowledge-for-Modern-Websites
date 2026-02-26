"use client";

import Link from "next/link";

import { KMW_NAV, KMW_SITE } from "@/lib/kmwNav";
import { useShell } from "@/components/ShellContext";

export default function SidebarNav() {
  const { sidebarOpen, setSidebarOpen, toggleSidebar } = useShell();

  return (
    <aside
      className={
        "fixed inset-y-0 left-0 z-[60] h-screen w-[340px] max-w-[85vw] overflow-y-auto border-r border-foreground/10 bg-background p-4 transition-transform duration-200 ease-out md:max-w-none " +
        (sidebarOpen
          ? "translate-x-0"
          : "-translate-x-full pointer-events-none")
      }
    >
      <div className="sticky top-0 -mx-4 mb-4 border-b border-foreground/10 bg-background/95 px-4 pb-3 pt-2 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="min-w-0">
            <div className="truncate text-base font-semibold tracking-tight">
              {KMW_SITE.name}
            </div>
            <div className="truncate text-sm text-foreground/70">{KMW_SITE.fullName}</div>
          </Link>

          <button
            type="button"
            aria-label="Đóng menu"
            onClick={toggleSidebar}
            className="inline-flex h-9 w-9 touch-manipulation items-center justify-center rounded-md border border-foreground/10 bg-background hover:bg-foreground/5"
          >
            <span className="sr-only">Close sidebar</span>
            <span className="block w-4">
              <span className="mb-1 block h-[2px] w-full bg-foreground/80" />
              <span className="mb-1 block h-[2px] w-full bg-foreground/80" />
              <span className="block h-[2px] w-full bg-foreground/80" />
            </span>
          </button>
        </div>
      </div>

      <div className="mb-4">
        <Link href="/" className="block">
          <div className="text-lg font-semibold tracking-tight">{KMW_SITE.name}</div>
          <div className="text-sm text-foreground/70">{KMW_SITE.fullName}</div>
        </Link>
      </div>

      <nav className="space-y-4">
        {KMW_NAV.map((category) => (
          <section key={category.slug} className="space-y-2">
            <div className="text-sm font-semibold text-foreground/90">
              {category.label}
            </div>
            <ul className="space-y-1">
              {category.topics.map((topic) => (
                <li key={topic.slug}>
                  <Link
                    href={`/${category.slug}/${topic.slug}`}
                    onClick={() => {
                      if (window.matchMedia("(max-width: 767px)").matches) {
                        setSidebarOpen(false);
                      }
                    }}
                    className="block rounded-md px-2 py-1 text-sm text-foreground/80 hover:bg-foreground/5 hover:text-foreground"
                  >
                    {topic.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>
    </aside>
  );
}
