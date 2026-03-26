import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Material } from "@/types/models";

type MaterialTableProps = {
  materials: Material[];
};

export function MaterialTable({ materials }: MaterialTableProps) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b p-5">
        <h3 className="section-title">Web results</h3>
        <p className="mt-1 text-sm text-slate-500">Generated candidate resources from live web retrieval.</p>
      </div>
      <div className="divide-y">
        {materials.map((material) => (
          <div key={material.id} className="flex items-center justify-between gap-4 p-5">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900">{material.title}</p>
              <p className="mt-1 text-sm capitalize text-slate-500">{material.candidateType ?? material.format}</p>
            </div>
            <a
              href={material.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-600"
            >
              Open link
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        ))}
        {!materials.length && <div className="p-8 text-center text-sm text-slate-500">No web results available for this topic yet.</div>}
      </div>
    </Card>
  );
}
