"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function HomePopup() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
    >
      <div className="relative mx-4 w-full max-w-3xl">
        <button
          type="button"
          aria-label="Đóng popup"
          onClick={() => setOpen(false)}
          className="absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-md border border-foreground/10 bg-background/90 text-foreground hover:bg-background"
        >
          <span className="text-lg leading-none">×</span>
        </button>

        <div className="overflow-hidden rounded-lg border border-foreground/10 bg-background">
          <Image
            src="/popup.png"
            alt="Popup"
            width={1200}
            height={800}
            priority
            className="h-auto w-full"
          />
        </div>
      </div>
    </div>
  );
}
