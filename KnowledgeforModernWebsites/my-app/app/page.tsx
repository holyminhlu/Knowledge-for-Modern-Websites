import Link from "next/link";

import HomePopup from "@/components/HomePopup";
import { KMW_NAV } from "@/lib/kmwNav";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-10">
      <HomePopup />
      <div className="grid gap-6 md:grid-cols-2">
        {KMW_NAV.map((category) => (
          <section
            key={category.slug}
            className="rounded-lg border border-foreground/10 bg-foreground/0 p-4"
          >
            <div className="text-sm font-semibold text-foreground/90">
              {category.label}
            </div>
            <ul className="mt-3 space-y-1">
              {category.topics.map((topic) => (
                <li key={topic.slug}>
                  <Link
                    href={`/${category.slug}/${topic.slug}`}
                    className="text-sm text-foreground/80 underline-offset-4 hover:underline"
                  >
                    {topic.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
