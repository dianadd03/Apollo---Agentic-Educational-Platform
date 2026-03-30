import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { SearchResult, TopicDetail } from "@/types/models";

type TopicDetailsProps = {
  topic: TopicDetail;
  materials: SearchResult[];
};

function FutureSection({ title, items, emptyLabel }: { title: string; items: string[]; emptyLabel: string }) {
  return (
    <Card className="p-5 border-[#c29f60]/20 bg-[linear-gradient(135deg,#1c1e26,#15171e)]">
      <h3 className="section-title">{title}</h3>
      {items.length ? (
        <ul className="mt-4 space-y-3 text-sm text-[#f4ead6]">
          {items.map((item) => (
            <li key={item} className="rounded-2xl border border-[#c29f60]/10 bg-[#12141a]/60 px-4 py-3 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm leading-7 text-[#dccfa6]/70">{emptyLabel}</p>
      )}
    </Card>
  );
}

export function TopicDetails({ topic, materials }: TopicDetailsProps) {
  return (
    <div className="space-y-6">
      <Card className="p-7 border-[#c29f60]/30 bg-[#161820]/90 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="info" className="capitalize bg-[#2c221d] text-[#c29f60] border border-[#4e232e] shadow-md">{topic.level}</Badge>
          <Badge tone="default" className="bg-[#12141a] text-[#dccfa6] border-[#c29f60]/20">Saved {new Date(topic.created_at).toLocaleDateString()}</Badge>
        </div>
        <h2 className="mt-4 text-5xl font-semibold text-[#f4ead6] font-serif">{topic.title}</h2>
        <p className="mt-4 max-w-3xl text-sm leading-8 text-[#dccfa6]/80">
          This topic remains part of the learning platform first. The library treatment simply organizes saved topics more beautifully while keeping room for materials, roadmaps, exercises, and coding tasks.
        </p>
      </Card>

      <Card className="p-6 border-[#c29f60]/20 bg-[#15171e]/90">
        <h3 className="section-title">Learning materials</h3>
        {materials.length ? (
          <div className="mt-5 space-y-3">
            {materials.map((item) => (
              <a
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-4 rounded-[20px] border border-[#c29f60]/20 bg-[#1c1e26]/80 px-5 py-4 transition hover:bg-[#2c221d] group"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[#f4ead6] group-hover:text-[#c29f60] transition-colors">{item.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[#a3835b]">{item.type}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge tone="default" className="bg-[#12141a] text-[#dccfa6] border-[#c29f60]/10">{item.source}</Badge>
                  <ExternalLink className="h-4 w-4 text-[#c29f60]" />
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-7 text-[#dccfa6]/70">No materials have been attached to this topic yet.</p>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <FutureSection title="Roadmap" items={topic.roadmap} emptyLabel="Roadmap steps will appear here once backend orchestration is connected." />
        <FutureSection title="Exercises" items={topic.exercises} emptyLabel="Exercises will appear here when practice generation is enabled." />
        <FutureSection title="Coding tasks" items={topic.coding_tasks} emptyLabel="Coding tasks will appear here when task generation is enabled." />
      </div>
    </div>
  );
}


