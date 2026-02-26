"use client";

import { useShell } from "@/components/ShellContext";
import Footer from "@/components/Footer";

export default function MainContainer({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useShell();

  return (
    <main
      className={
        sidebarOpen
          ? "min-w-0 flex-1 pt-[calc(var(--kmw-header-h)+var(--kmw-header-gap))] md:pl-[340px]"
          : "min-w-0 flex-1 pt-[calc(var(--kmw-header-h)+var(--kmw-header-gap))]"
      }
    >
      <div className="min-h-[calc(100vh-var(--kmw-header-h)-var(--kmw-header-gap))]">
        <div className="flex min-h-[calc(100vh-var(--kmw-header-h)-var(--kmw-header-gap))] flex-col">
          <div className="flex-1">{children}</div>
          <Footer />
        </div>
      </div>
    </main>
  );
}
