import { ArrowRight, Code2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { FoundationalTask } from "@/types/models";

type TaskCardProps = {
  task: FoundationalTask;
  onOpen: (task: FoundationalTask) => void;
};

export function TaskCard({ task, onOpen }: TaskCardProps) {
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Step {task.sequenceOrder}</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-950">{task.title}</h3>
        </div>
        <Badge tone={task.difficulty === "Intro" ? "info" : task.difficulty === "Core" ? "default" : "warning"}>{task.difficulty}</Badge>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{task.objective}</p>
      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Sparkles className="h-4 w-4 text-sky-600" />
          Why this appears now
        </div>
        <p className="mt-2 text-sm text-slate-500">{task.whyInSequence}</p>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {task.prerequisites.map((prerequisite) => (
          <Badge key={prerequisite}>{prerequisite}</Badge>
        ))}
      </div>
      <Button className="mt-auto w-full" onClick={() => onOpen(task)}>
        <Code2 className="mr-2 h-4 w-4" />
        Open in code editor
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </Card>
  );
}
