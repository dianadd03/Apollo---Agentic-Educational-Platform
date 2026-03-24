import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AgentRun } from "@/types/models";

export function AgentRunTimeline({ runs }: { runs: AgentRun[] }) {
  return (
    <div className="space-y-5">
      {runs.map((run) => (
        <Card key={run.id} className="p-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <p className="text-sm text-slate-500">Run {run.id}</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-950">{run.query}</h3>
            </div>
            <div className="flex gap-2">
              <Badge tone={run.status === "Complete" ? "success" : run.status === "Healthy" ? "info" : "warning"}>{run.status}</Badge>
              <Badge tone="default">Retries {run.retries}</Badge>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {run.stages.map((stage) => (
              <div key={stage.id} className="grid gap-4 rounded-2xl border p-4 md:grid-cols-[180px_1fr_150px_120px]">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{stage.name}</p>
                  <p className="text-xs text-slate-400">{stage.timestamp}</p>
                </div>
                <p className="text-sm text-slate-500">{stage.notes}</p>
                <div className="text-sm text-slate-500">Confidence {(stage.confidence * 100).toFixed(0)}%</div>
                <div className="flex justify-start md:justify-end">
                  <Badge tone={stage.status === "Completed" ? "success" : stage.status === "Failed" ? "danger" : stage.status === "Retrying" ? "warning" : "default"}>
                    {stage.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
