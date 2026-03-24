import { ExternalLink, PanelRightOpen } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Material } from "@/types/models";

type MaterialTableProps = {
  materials: Material[];
};

function materialTone(material: Material) {
  if (material.validationStatus === "Needs Review") return "warning";
  if (material.validationStatus === "Pending") return "default";
  return "success";
}

export function MaterialTable({ materials }: MaterialTableProps) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [validationFilter, setValidationFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"quality" | "difficulty">("quality");
  const [selected, setSelected] = useState<Material | null>(materials[0] ?? null);

  const filtered = useMemo(() => {
    return [...materials]
      .filter((material) => (typeFilter === "all" ? true : material.format === typeFilter))
      .filter((material) =>
        difficultyFilter === "all" ? true : difficultyFilter === "beginner" ? material.difficulty <= 4 : material.difficulty >= 5,
      )
      .filter((material) => (sourceFilter === "all" ? true : sourceFilter === material.provenanceType))
      .filter((material) => (validationFilter === "all" ? true : material.validationStatus === validationFilter))
      .sort((a, b) => (sortBy === "quality" ? b.qualityScore - a.qualityScore : a.difficulty - b.difficulty));
  }, [materials, typeFilter, difficultyFilter, sourceFilter, validationFilter, sortBy]);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="section-title">Learning materials</h3>
            <p className="mt-1 text-sm text-slate-500">Filter by content type, provenance, validation state, and difficulty band.</p>
          </div>
          <div className="grid gap-2 md:grid-cols-5">
            <select className="rounded-xl border bg-white px-3 py-2 text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All types</option>
              <option value="article">Articles</option>
              <option value="video">Videos</option>
              <option value="book">Books</option>
              <option value="site">Sites</option>
            </select>
            <select
              className="rounded-xl border bg-white px-3 py-2 text-sm"
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
            >
              <option value="all">Any difficulty</option>
              <option value="beginner">1-4</option>
              <option value="advanced">5-10</option>
            </select>
            <select className="rounded-xl border bg-white px-3 py-2 text-sm" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
              <option value="all">All sources</option>
              <option value="internal">Internal</option>
              <option value="web">Web found</option>
            </select>
            <select
              className="rounded-xl border bg-white px-3 py-2 text-sm"
              value={validationFilter}
              onChange={(e) => setValidationFilter(e.target.value)}
            >
              <option value="all">All validation</option>
              <option value="Validated">Validated</option>
              <option value="Pending">Pending</option>
              <option value="Needs Review">Needs Review</option>
            </select>
            <select className="rounded-xl border bg-white px-3 py-2 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
              <option value="quality">Sort: quality</option>
              <option value="difficulty">Sort: difficulty</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Difficulty</th>
                <th className="px-5 py-3 font-medium">Quality</th>
                <th className="px-5 py-3 font-medium">Reason</th>
                <th className="px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((material) => (
                <tr
                  key={material.id}
                  className="cursor-pointer border-t transition hover:bg-slate-50"
                  onClick={() => setSelected(material)}
                >
                  <td className="px-5 py-4">
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-900">{material.title}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={material.provenanceType === "internal" ? "info" : "default"}>
                          {material.provenanceType === "internal" ? "Internal" : "Web Found"}
                        </Badge>
                        <Badge tone={materialTone(material)}>
                          {material.validationStatus === "Validated"
                            ? "Validated"
                            : material.validationStatus === "Needs Review"
                              ? "Low Confidence"
                              : "Pending"}
                        </Badge>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{material.source}</td>
                  <td className="px-5 py-4 capitalize text-slate-600">{material.format}</td>
                  <td className="px-5 py-4 text-slate-600">{material.difficulty}/10</td>
                  <td className="px-5 py-4 text-slate-600">{material.qualityScore}</td>
                  <td className="max-w-xs px-5 py-4 text-slate-500">{material.recommendationReason}</td>
                  <td className="px-5 py-4">
                    <a href={material.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sky-700 hover:text-sky-600">
                      Open <ExternalLink className="h-4 w-4" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <div className="p-8 text-center text-sm text-slate-500">No materials match these filters.</div>}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="section-title">Recommendation detail</h3>
          <PanelRightOpen className="h-4 w-4 text-slate-400" />
        </div>
        {selected ? (
          <div className="mt-5 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Selected material</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{selected.title}</p>
              <p className="mt-2 text-sm text-slate-500">{selected.recommendationReason}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-slate-400">Relevance</p>
                <p className="mt-1 font-semibold text-slate-950">{selected.relevanceScore}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-slate-400">Confidence</p>
                <p className="mt-1 font-semibold text-slate-950">{(selected.confidence * 100).toFixed(0)}%</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Prerequisites</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selected.prerequisites.map((prerequisite) => (
                  <Badge key={prerequisite}>{prerequisite}</Badge>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={() => window.open(selected.url, "_blank", "noreferrer")}>
              Open material
            </Button>
          </div>
        ) : (
          <p className="mt-6 text-sm text-slate-500">Select a row to inspect recommendation rationale and provenance.</p>
        )}
      </Card>
    </div>
  );
}
