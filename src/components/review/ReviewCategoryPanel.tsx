import { AlertCircle, BrushCleaning, Bug, Gauge, ScanSearch } from "lucide-react";
import type { CodeReview, ReviewFinding } from "@/types/models";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type ReviewCategoryPanelProps = {
  review: CodeReview;
  loading: boolean;
  onHoverFinding: (finding: ReviewFinding | null) => void;
};

const categories = [
  { key: "bugs", label: "Bugs", icon: Bug, tone: "danger" as const },
  { key: "edgeCases", label: "Edge Cases", icon: AlertCircle, tone: "warning" as const },
  { key: "optimizations", label: "Optimizations", icon: Gauge, tone: "info" as const },
  { key: "style", label: "Styling / Indentation", icon: BrushCleaning, tone: "default" as const },
];

export function ReviewCategoryPanel({ review, loading, onHoverFinding }: ReviewCategoryPanelProps) {
  const totalFindings = Object.values(review.findings).reduce((sum, current) => sum + current.length, 0);

  if (!review.code && !loading) {
    return (
      <Card className="p-6">
        <div className="rounded-2xl border border-dashed p-8 text-center">
          <ScanSearch className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-950">No review submitted yet</h3>
          <p className="mt-2 text-sm text-slate-500">Open a foundational task or paste your own solution to start AI-assisted review.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="section-title">AI review findings</h3>
          <p className="mt-1 text-sm text-slate-500">Categorized feedback grounded in code regions so the learner knows what to fix next.</p>
        </div>
        <Badge tone={loading ? "info" : totalFindings ? "success" : "default"}>{loading ? "Reviewing" : `${totalFindings} findings`}</Badge>
      </div>

      {loading ? (
        <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">Apollo is analyzing runtime logic, edge cases, and implementation quality.</div>
      ) : (
        <div className="mt-5 space-y-4">
          {categories.map((category) => {
            const Icon = category.icon;
            const items = review.findings[category.key as keyof CodeReview["findings"]];
            return (
              <div key={category.key} className="rounded-2xl border">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Icon className="h-4 w-4" />
                    {category.label}
                  </div>
                  <Badge tone={category.tone}>{items.length}</Badge>
                </div>
                <div className="space-y-3 p-4">
                  {items.length ? (
                    items.map((finding) => (
                      <button
                        key={finding.id}
                        className="w-full rounded-2xl bg-slate-50 p-4 text-left transition hover:bg-sky-50"
                        onMouseEnter={() => onHoverFinding(finding)}
                        onMouseLeave={() => onHoverFinding(null)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">{finding.title}</p>
                          <span className="text-xs text-slate-400">
                            Lines {finding.lineStart}-{finding.lineEnd}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{finding.detail}</p>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No findings in this category.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-dashed bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">Future compiler integration</p>
        <p className="mt-1 text-sm text-slate-500">Reserved execution slot for runtime traces, test cases, and language-specific linting signals.</p>
      </div>
    </Card>
  );
}
