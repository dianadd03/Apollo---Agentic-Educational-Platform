import { useMemo, useState } from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AggregatedProblem, ProblemListMetadata } from "@/types/models";

type ProblemsSectionProps = {
  problems: AggregatedProblem[];
  metadata: ProblemListMetadata | null;
  loading: boolean;
  error: string | null;
};

const SOURCE_LABELS: Record<string, string> = {
  codeforces: "Codeforces",
  leetcode: "LeetCode",
  atcoder: "AtCoder",
  generated: "AI Generated",
};

const DIFFICULTY_TONES: Record<string, "success" | "warning" | "info" | "default"> = {
  beginner: "success",
  intermediate: "info",
  advanced: "warning",
};

export function ProblemsSection({ problems, metadata, loading, error }: ProblemsSectionProps) {
  const [platform, setPlatform] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<string>("all");

  const filtered = useMemo(() => {
    return problems
      .filter((p) => (platform === "all" ? true : p.source === platform))
      .filter((p) => (difficulty === "all" ? true : p.difficulty_label === difficulty));
  }, [problems, platform, difficulty]);

  return (
    <Card className="p-6 border-[var(--btn-secondary-border)] bg-[var(--subtle-bg)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="section-title">Practice problems</h3>
          <p className="mt-1 text-sm text-[var(--library-copy-color)]">
            Aggregated from Codeforces, LeetCode, AtCoder, and AI-generated bridging problems.
          </p>
          {metadata ? (
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--library-copy-color)]">
              {metadata.tags_used.length > 0 && (
                <span>Tags: {metadata.tags_used.join(", ")}</span>
              )}
              {metadata.cached && <Badge tone="info">Cached</Badge>}
              {metadata.generated_count > 0 && (
                <Badge tone="warning">{metadata.generated_count} AI-generated</Badge>
              )}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-xl border border-[var(--btn-secondary-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-text)]"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            <option value="all">All platforms</option>
            <option value="codeforces">Codeforces</option>
            <option value="leetcode">LeetCode</option>
            <option value="atcoder">AtCoder</option>
            <option value="generated">AI Generated</option>
          </select>
          <select
            className="rounded-xl border border-[var(--btn-secondary-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--input-text)]"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="all">All difficulty</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <p className="text-sm text-[var(--library-copy-color)]">Loading practice problems...</p>
        ) : error ? (
          <p className="text-sm text-rose-300">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[var(--library-copy-color)]">
            No practice problems match these filters yet. Try a broader topic or different filters.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--table-row-border)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--table-header-bg)] text-[var(--table-header-text)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Difficulty</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Success</th>
                  <th className="px-4 py-3 font-medium">Match</th>
                  <th className="px-4 py-3 font-medium">Open</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-t border-[var(--table-row-border)] hover:bg-[var(--table-row-hover-bg)]">
                    <td className="px-4 py-3 max-w-md">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[var(--foreground)]">{p.title}</span>
                        {p.is_generated && (
                          <Badge tone="warning" className="inline-flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> AI
                          </Badge>
                        )}
                      </div>
                      {p.generated_objective && (
                        <p className="mt-1 text-xs text-[var(--library-copy-color)]">{p.generated_objective}</p>
                      )}
                      {p.tags.length > 0 && (
                        <p className="mt-1 text-xs text-[#a3835b]">{p.tags.slice(0, 4).join(" · ")}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{SOURCE_LABELS[p.source] ?? p.source}</td>
                    <td className="px-4 py-3">
                      <Badge tone={DIFFICULTY_TONES[p.difficulty_label] ?? "default"} className="capitalize">
                        {p.difficulty_label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{p.normalized_difficulty}/10</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">
                      {p.success_rate !== null ? `${Math.round(p.success_rate * 100)}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{Math.round(p.topic_match * 100)}%</td>
                    <td className="px-4 py-3">
                      <a
                         href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#c29f60] hover:text-[var(--foreground)]"
                      >
                        Open <ExternalLink className="h-4 w-4" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
