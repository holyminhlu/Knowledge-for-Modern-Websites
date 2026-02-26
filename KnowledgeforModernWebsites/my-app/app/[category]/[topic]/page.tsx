import { notFound } from "next/navigation";
import type { Metadata } from "next";

import Mermaid from "@/components/Mermaid";
import MarkdownContent from "@/components/MarkdownContent";
import { KMW_SITE, getAllTopicRoutes, getTopic } from "@/lib/kmwNav";
import { getMarkdownForRoute } from "@/lib/kmwMarkdown";
import { getTopicIllustration } from "@/lib/kmwIllustrations";

type PageProps = {
  params: Promise<{ category: string; topic: string }>;
};

export async function generateStaticParams() {
  return getAllTopicRoutes();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category, topic } = await params;
  const match = getTopic(category, topic);
  if (!match) return { title: `${KMW_SITE.name}` };

  return {
    title: `${match.topic.label} | ${KMW_SITE.name}`,
    description: match.category.label,
  };
}

export default async function TopicPage({ params }: PageProps) {
  const { category, topic } = await params;
  const result = await getMarkdownForRoute(category, topic);
  if (!result) notFound();

  const illustration = getTopicIllustration(category, topic);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-8">
      <div className="mb-6">
        <div className="text-sm text-foreground/70">{result.category.label}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {result.topic.label}
        </h1>
      </div>

      {illustration ? (
        <section className="mb-8">
          <div className="mb-2 text-sm font-semibold text-foreground/90">
            {illustration.title}
          </div>
          <Mermaid chart={illustration.mermaid} />
        </section>
      ) : null}

      <MarkdownContent source={result.source} />
    </div>
  );
}
