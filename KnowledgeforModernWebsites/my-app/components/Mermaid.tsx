"use client";

import { useEffect, useId, useMemo, useState } from "react";
import mermaid from "mermaid";

type MermaidProps = {
  chart: string;
};

export default function Mermaid({ chart }: MermaidProps) {
  const reactId = useId();
  const id = useMemo(() => `kmw-mermaid-${reactId.replace(/[:]/g, "-")}`, [reactId]);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);
      try {
        mermaid.initialize({ startOnLoad: false });
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled) setSvg(svg);
      } catch (e) {
        if (!cancelled) {
          setSvg("");
          setError(e instanceof Error ? e.message : "Failed to render diagram");
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (error) {
    return (
      <div className="rounded-md border border-foreground/10 bg-foreground/5 p-3 text-sm text-foreground/80">
        Mermaid render error: {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="rounded-md border border-foreground/10 bg-foreground/5 p-3 text-sm text-foreground/70">
        Rendering diagram…
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto"
      // Mermaid returns SVG markup
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
