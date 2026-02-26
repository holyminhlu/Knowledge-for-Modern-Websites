import { isValidElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import Mermaid from "@/components/Mermaid";

type MarkdownContentProps = {
  source: string;
};

export default function MarkdownContent({ source }: MarkdownContentProps) {
  return (
    <div className="kmw-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre({ children, ...props }) {
            const onlyChild = Array.isArray(children) ? children[0] : children;
            if (isValidElement(onlyChild) && onlyChild.type === Mermaid) {
              return <div className="mt-4">{onlyChild}</div>;
            }

            return (
              <pre
                className="mt-4 overflow-x-auto rounded-md border border-foreground/10 bg-foreground/5 p-3"
                {...props}
              >
                {children}
              </pre>
            );
          },
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className ?? "");
            const language = match?.[1];
            const code = String(children ?? "").replace(/\n$/, "");

            const isInline = !language && !code.includes("\n");

            if (!isInline && language === "mermaid") {
              return <Mermaid chart={code} />;
            }

            if (isInline) {
              return (
                <code
                  className="rounded bg-foreground/5 px-1 py-0.5 text-[0.95em]"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          a({ children, ...props }) {
            return (
              <a className="underline underline-offset-4" {...props}>
                {children}
              </a>
            );
          },
          h1({ children, ...props }) {
            return (
              <h1 className="mt-6 text-3xl font-semibold tracking-tight" {...props}>
                {children}
              </h1>
            );
          },
          h2({ children, ...props }) {
            return (
              <h2 className="mt-6 text-2xl font-semibold tracking-tight" {...props}>
                {children}
              </h2>
            );
          },
          h3({ children, ...props }) {
            return (
              <h3 className="mt-5 text-xl font-semibold tracking-tight" {...props}>
                {children}
              </h3>
            );
          },
          p({ children, ...props }) {
            return (
              <p className="mt-3 leading-7 text-foreground/85" {...props}>
                {children}
              </p>
            );
          },
          ul({ children, ...props }) {
            return (
              <ul className="mt-3 list-disc space-y-1 pl-5" {...props}>
                {children}
              </ul>
            );
          },
          ol({ children, ...props }) {
            return (
              <ol className="mt-3 list-decimal space-y-1 pl-5" {...props}>
                {children}
              </ol>
            );
          },
          li({ children, ...props }) {
            return (
              <li className="leading-7 text-foreground/85" {...props}>
                {children}
              </li>
            );
          },
          blockquote({ children, ...props }) {
            return (
              <blockquote
                className="mt-4 border-l-2 border-foreground/20 pl-4 text-foreground/80"
                {...props}
              >
                {children}
              </blockquote>
            );
          },
          table({ children, ...props }) {
            return (
              <div className="mt-4 overflow-x-auto">
                <table
                  className="w-full border-collapse border border-foreground/10 text-sm"
                  {...props}
                >
                  {children}
                </table>
              </div>
            );
          },
          th({ children, ...props }) {
            return (
              <th
                className="border border-foreground/10 bg-foreground/5 px-3 py-2 text-left font-semibold"
                {...props}
              >
                {children}
              </th>
            );
          },
          td({ children, ...props }) {
            return (
              <td className="border border-foreground/10 px-3 py-2" {...props}>
                {children}
              </td>
            );
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
