"use client";

import { createContext, useContext, useMemo, useState } from "react";

type ShellContextValue = {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const value = useMemo<ShellContextValue>(() => {
    return {
      sidebarOpen,
      setSidebarOpen,
      toggleSidebar: () => setSidebarOpen((s) => !s),
    };
  }, [sidebarOpen]);

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) {
    throw new Error("useShell must be used within ShellProvider");
  }
  return ctx;
}
