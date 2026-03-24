import { ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Problem } from "@/types/models";

export function ProblemTable({ problems }: { problems: Problem[] }) {
  const [platform, setPlatform] = useState("all");
  const [difficulty, setDifficulty] = useState("all");

  const filtered = useMemo(
    () =>
      problems.filter((problem) => (platform === "all" ? true : problem.source === platform)).filter((problem) => (difficulty === "all" ? true : problem.difficulty === difficulty)),
    [problems, platform, difficulty],
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="section-title">Practice problems</h3>
          <p className="mt-1 text-sm text-slate-500">Mix of fetched platform problems and clearly-labeled AI-generated bridging prompts.</p>
        </div>
        <div className="flex gap-2">
          <select className="rounded-xl border bg-white px-3 py-2 text-sm" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="all">All platforms</option>
            <option value="Codeforces">Codeforces</option>
            <option value="LeetCode">LeetCode</option>
            <option value="AtCoder">AtCoder</option>
            <option value="General Problems">General Problems</option>
          </select>
          <select className="rounded-xl border bg-white px-3 py-2 text-sm" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="all">All difficulty</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Problem title</th>
              <th className="px-5 py-3 font-medium">Source</th>
              <th className="px-5 py-3 font-medium">Difficulty</th>
              <th className="px-5 py-3 font-medium">Success rate</th>
              <th className="px-5 py-3 font-medium">Topic match</th>
              <th className="px-5 py-3 font-medium">Link</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((problem) => (
              <tr key={problem.id} className="border-t">
                <td className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{problem.title}</span>
                    {problem.generated && <Badge tone="warning">AI-generated</Badge>}
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-600">{problem.source}</td>
                <td className="px-5 py-4 text-slate-600">{problem.difficulty}</td>
                <td className="px-5 py-4 text-slate-600">{problem.successRate}%</td>
                <td className="px-5 py-4 text-slate-600">{problem.topicMatch}%</td>
                <td className="px-5 py-4">
                  <a href={problem.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sky-700 hover:text-sky-600">
                    Open <ExternalLink className="h-4 w-4" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <div className="p-8 text-center text-sm text-slate-500">No problems match these filters.</div>}
      </div>
    </Card>
  );
}
