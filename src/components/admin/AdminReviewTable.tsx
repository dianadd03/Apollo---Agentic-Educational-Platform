import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Material } from "@/types/models";

type AdminMaterial = Material & {
  topic: string;
  provenanceNotes: string;
  validationNotes: string;
};

export function AdminReviewTable({ items }: { items: AdminMaterial[] }) {
  const [rows, setRows] = useState(items);
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(
    () => rows.filter((item) => (filter === "all" ? true : filter === "low" ? item.confidence < 0.75 : item.validationStatus === "Needs Review")),
    [rows, filter],
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="section-title">Moderation queue</h3>
          <p className="mt-1 text-sm text-slate-500">Professors can inspect provenance, update metadata, and override low-confidence judgments.</p>
        </div>
        <select className="rounded-xl border bg-white px-3 py-2 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All items</option>
          <option value="low">Confidence below 75%</option>
          <option value="Needs Review">Needs review</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Material</th>
              <th className="px-5 py-3 font-medium">Topic</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Difficulty</th>
              <th className="px-5 py-3 font-medium">Confidence</th>
              <th className="px-5 py-3 font-medium">Validation notes</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="border-t align-top">
                <td className="px-5 py-4">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-2 text-xs text-slate-500">{item.provenanceNotes}</p>
                </td>
                <td className="px-5 py-4 text-slate-600">{item.topic}</td>
                <td className="px-5 py-4">
                  <select
                    className="rounded-xl border bg-white px-3 py-2 text-sm"
                    value={item.format}
                    onChange={(e) =>
                      setRows((current) => current.map((row) => (row.id === item.id ? { ...row, format: e.target.value as Material["format"] } : row)))
                    }
                  >
                    <option value="article">Article</option>
                    <option value="video">Video</option>
                    <option value="book">Book</option>
                    <option value="site">Site</option>
                  </select>
                </td>
                <td className="px-5 py-4">
                  <select
                    className="rounded-xl border bg-white px-3 py-2 text-sm"
                    value={item.difficulty}
                    onChange={(e) =>
                      setRows((current) => current.map((row) => (row.id === item.id ? { ...row, difficulty: Number(e.target.value) } : row)))
                    }
                  >
                    {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-4">
                  <Badge tone={item.confidence < 0.7 ? "warning" : "success"}>{(item.confidence * 100).toFixed(0)}%</Badge>
                </td>
                <td className="max-w-sm px-5 py-4 text-slate-500">{item.validationNotes}</td>
                <td className="px-5 py-4">
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setRows((current) =>
                          current.map((row) =>
                            row.id === item.id ? { ...row, validationStatus: "Validated", confidence: Math.max(row.confidence, 0.88) } : row,
                          ),
                        )
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setRows((current) => current.map((row) => (row.id === item.id ? { ...row, validationStatus: "Needs Review" } : row)))}
                    >
                      Hold
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
