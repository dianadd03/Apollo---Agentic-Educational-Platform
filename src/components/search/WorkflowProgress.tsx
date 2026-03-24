import { CheckCircle2, Clock3, Loader2, RotateCcw, XCircle } from "lucide-react";
import type { AgentRun } from "@/types/models";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const iconMap = {
  Completed: CheckCircle2,
  Running: Loader2,
  Queued: Clock3,
  Retrying: RotateCcw,
  Failed: XCircle,
};

const toneMap = {
  Completed: "success",
  Running: "info",
  Queued: "default",
  Retrying: "warning",
  Failed: "danger",
} as const;

export function WorkflowProgress({ run }: { run: AgentRun }) {
  return (
    <Card className="overflow-hidden p-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm text-slate-500">Agentic workflow</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">Query orchestration for “{run.query}”</h3>
        </div>
        <div className="flex gap-2">
          <Badge tone={run.status === "Complete" ? "success" : run.status === "Healthy" ? "info" : "warning"}>{run.status}</Badge>
          <Badge tone="default">Confidence {(run.confidence * 100).toFixed(0)}%</Badge>
        </div>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-7">
        {run.stages.map((stage) => {
          const Icon = iconMap[stage.status];
          return (
            <div key={stage.id} className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-700">
                  <Icon className={stage.status === "Running" ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                </div>
                <Badge tone={toneMap[stage.status]}>{stage.status}</Badge>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-900">{stage.name}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{stage.notes}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span>{stage.timestamp}</span>
                <span>{(stage.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
