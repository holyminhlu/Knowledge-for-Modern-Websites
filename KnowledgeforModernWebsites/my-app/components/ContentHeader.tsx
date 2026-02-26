"use client";

import { KMW_SITE } from "@/lib/kmwNav";
import { useShell } from "@/components/ShellContext";

export default function ContentHeader() {
  const { sidebarOpen, toggleSidebar } = useShell();

  return (
    <header
      className={
        sidebarOpen
          ? "fixed top-0 right-0 left-0 z-10 border-b border-foreground/10 bg-background/80 backdrop-blur md:left-[340px]"
          : "fixed top-0 right-0 left-0 z-10 border-b border-foreground/10 bg-background/80 backdrop-blur"
      }
    >
      <div className="mx-auto w-full max-w-5xl px-4 py-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            aria-label={sidebarOpen ? "Ẩn menu" : "Hiện menu"}
            onClick={toggleSidebar}
            className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-md border border-foreground/10 bg-background hover:bg-foreground/5"
          >
            <span className="sr-only">Toggle sidebar</span>
            <span className="block w-4">
              <span className="mb-1 block h-[2px] w-full bg-foreground/80" />
              <span className="mb-1 block h-[2px] w-full bg-foreground/80" />
              <span className="block h-[2px] w-full bg-foreground/80" />
            </span>
          </button>

          <div className="min-w-0">
            <div className="text-lg font-semibold tracking-tight">
              {KMW_SITE.name} - {KMW_SITE.fullName}
            </div>
            <p className="mt-1 text-sm text-foreground/80">
              Website lưu trữ kiến thức về các thành phần thường dùng khi xây dựng hệ
              thống web hiện đại. Chọn một chủ đề từ menu để bắt đầu.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
