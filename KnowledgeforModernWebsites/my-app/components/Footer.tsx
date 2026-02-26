"use client";

import Link from "next/link";

const APP_VERSION = "0.1.0";

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-foreground/10">
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <section>
            <div className="text-sm font-semibold text-foreground/90">About</div>
            <ul className="mt-3 space-y-2 text-sm text-foreground/80">
              <li>About project</li>
              <li>Author</li>
              <li>
                <a
                  className="underline underline-offset-4"
                  href="https://github.com/holyminhlu/Knowledge-for-Modern-Websites"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </section>

          <section>
            <div className="text-sm font-semibold text-foreground/90">Resources</div>
            <ul className="mt-3 space-y-2 text-sm text-foreground/80">
              <li>
                <Link className="underline underline-offset-4" href="/">
                  All topics
                </Link>
              </li>
              <li>Learning path</li>
              <li>Roadmap</li>
            </ul>
          </section>

          <section>
            <div className="text-sm font-semibold text-foreground/90">Legal</div>
            <ul className="mt-3 space-y-2 text-sm text-foreground/80">
              <li>Terms</li>
              <li>Privacy</li>
              <li>License</li>
            </ul>
          </section>
        </div>
      </div>

      <div className="border-t border-foreground/10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-4 text-sm text-foreground/75 md:flex-row md:items-center md:justify-between">
          <div>Built with Next Js</div>
          <div>Version {APP_VERSION}</div>
          <div>© 2026 Minh Lữ</div>
        </div>
      </div>
    </footer>
  );
}
