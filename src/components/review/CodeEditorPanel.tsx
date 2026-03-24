import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type CodeEditorPanelProps = {
  code: string;
  onChange: (value: string) => void;
  highlightedRange?: { start: number; end: number } | null;
  stale: boolean;
};

export function CodeEditorPanel({ code, onChange, highlightedRange, stale }: CodeEditorPanelProps) {
  const lines = useMemo(() => (code.length ? code.split("\n") : [""]), [code]);
  const lineHeight = 24;
  const highlightTop = highlightedRange ? (highlightedRange.start - 1) * lineHeight + 12 : 0;
  const highlightHeight = highlightedRange ? (highlightedRange.end - highlightedRange.start + 1) * lineHeight : 0;

  return (
    <Card className="relative overflow-hidden p-0">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">Code editor</h3>
          <p className="text-xs text-slate-500">Hover findings on the right to highlight related lines.</p>
        </div>
        {stale && <Badge tone="warning">Feedback stale after edits</Badge>}
      </div>
      <div className="relative overflow-hidden">
        {highlightedRange && (
          <div
            className="pointer-events-none absolute inset-x-12 rounded-xl border border-sky-300 bg-sky-100/80 transition-all"
            style={{ top: `${highlightTop}px`, height: `${highlightHeight}px` }}
          />
        )}
        <div className="grid min-h-[520px] grid-cols-[56px_minmax(0,1fr)] bg-slate-950 text-sm text-slate-100">
          <div className="border-r border-slate-800 bg-slate-950/90 px-3 py-3 text-right text-slate-500">
            {lines.map((_, index) => (
              <div key={index} style={{ lineHeight: `${lineHeight}px` }}>
                {index + 1}
              </div>
            ))}
          </div>
          <textarea
            value={code}
            onChange={(event) => onChange(event.target.value)}
            spellCheck={false}
            className="min-h-[520px] w-full resize-none bg-transparent px-4 py-3 font-mono leading-6 text-slate-100"
          />
        </div>
      </div>
    </Card>
  );
}
