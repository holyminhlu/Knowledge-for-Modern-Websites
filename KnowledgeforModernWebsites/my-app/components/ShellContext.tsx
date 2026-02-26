"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type ShellContextValue = {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Luôn mặc định đóng menu khi load/reload.
    setSidebarOpen(false);
  }, []);

  useEffect(() => {
    // Khi về trang chủ (bấm logo hoặc điều hướng về /), đóng menu.
    if (pathname === "/") {
      setSidebarOpen(false);
    }
  }, [pathname]);

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
