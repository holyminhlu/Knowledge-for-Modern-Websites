import { cache } from "react";
import path from "node:path";
import { readFile } from "node:fs/promises";

import { getTopic } from "@/lib/kmwNav";

function getRepoRootFromAppCwd(): string {
  // my-app is located at: <repo>/KnowledgeforModernWebsites/my-app
  // Markdown lives at:  <repo>/<CategoryFolder>/<File>.md
  return path.resolve(process.cwd(), "..", "..");
}

function stripFrontmatter(markdown: string): string {
  // Supports common YAML frontmatter:
  // ---
  // key: value
  // ---
  if (!markdown.startsWith("---\n")) return markdown;
  const end = markdown.indexOf("\n---\n", 4);
  if (end === -1) return markdown;
  return markdown.slice(end + "\n---\n".length);
}

export const getMarkdownForRoute = cache(async (categorySlug: string, topicSlug: string) => {
  const match = getTopic(categorySlug, topicSlug);
  if (!match) return null;

  const repoRoot = getRepoRootFromAppCwd();
  const mdPath = path.join(repoRoot, match.category.folderName, match.topic.fileName);

  try {
    const raw = await readFile(mdPath, "utf8");
    const source = stripFrontmatter(raw);
    return { source, mdPath, ...match };
  } catch {
    return null;
  }
});
