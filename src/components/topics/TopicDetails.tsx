import { ExternalLink, ShieldCheck, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { resolveMaterialUrl } from "@/lib/materialUrls";
import type { SearchResult, TopicDetail } from "@/types/models";

type TopicDetailsProps = {
  topic: TopicDetail;
  materials: SearchResult[];
};

const TRUSTED_TOPIC_THRESHOLD = 0.55;

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

function isTrustedSource(item: SearchResult) {
  return ["admin", "professor", "verified"].includes(item.source_of_result ?? "");
}

function relevanceValue(item: SearchResult) {
  return item.score ?? item.confidence;
}

function sourceBadgeLabel(item: SearchResult) {
  switch (item.source_of_result) {
    case "admin":
      return "Admin managed";
    case "professor":
      return "Professor managed";
    case "verified":
      return "Verified";
    case "promoted":
      return "Highly liked";
    case "db_internal":
      return "Internal";
    case "web":
      return "Web fallback";
    default:
      return item.is_internal ? "Internal" : "External";
  }
}

function sourceBadgeTone(item: SearchResult): "success" | "warning" | "info" | "default" {
  switch (item.source_of_result) {
    case "admin":
    case "professor":
    case "verified":
      return "success";
    case "promoted":
      return "info";
    case "web":
      return "warning";
    default:
      return "default";
  }
}

function MaterialCard({ item }: { item: SearchResult }) {
  const href = resolveMaterialUrl(item.url);
  const isTrusted = isTrustedSource(item);

  return (
    <a
      key={item.url}
      href={href || "#"}
      target="_blank"
      rel="noreferrer"
      className="block rounded-[20px] border border-[#c29f60]/20 bg-[#1c1e26]/80 px-5 py-4 transition hover:bg-[#2c221d] group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-[#f4ead6] group-hover:text-[#c29f60] transition-colors">{item.title}</p>
            <Badge tone={sourceBadgeTone(item)} className="border-[#c29f60]/15">{sourceBadgeLabel(item)}</Badge>
            {item.is_verified ? <Badge tone="success">Trusted</Badge> : null}
          </div>
          <p className="mt-2 text-xs uppercase tracking-[0.22em] text-[#a3835b]">{item.type}</p>
          {item.snippet ? <p className="mt-3 text-sm leading-7 text-[#dccfa6]/75">{item.snippet}</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#dccfa6]/65">
            <span>{item.source}</span>
            {typeof item.like_count === "number" ? <span>Likes: {item.like_count}</span> : null}
            {typeof item.score === "number" ? <span>Score: {(item.score * 100).toFixed(0)}%</span> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[#c29f60]">
          {isTrusted ? <ShieldCheck className="h-4 w-4" /> : <Star className="h-4 w-4" />}
          <ExternalLink className="h-4 w-4" />
        </div>
      </div>
    </a>
  );
}

export function TopicDetails({ topic, materials }: TopicDetailsProps) {
  const visibleMaterials = materials.filter((item) => !isTrustedSource(item) || relevanceValue(item) >= TRUSTED_TOPIC_THRESHOLD);
  const trustedMaterials = visibleMaterials.filter((item) => isTrustedSource(item) && relevanceValue(item) >= TRUSTED_TOPIC_THRESHOLD);
  const otherMaterials = visibleMaterials.filter((item) => !trustedMaterials.includes(item));

  return (
    <div className="space-y-6">
      <Card className="p-7 border-[#c29f60]/30 bg-[#161820]/90 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="info" className="capitalize bg-[#2c221d] text-[#c29f60] border border-[#4e232e] shadow-md">{topic.level}</Badge>
          <Badge tone="default" className="bg-[#12141a] text-[#dccfa6] border-[#c29f60]/20">Saved {new Date(topic.created_at).toLocaleDateString()}</Badge>
          {trustedMaterials.length ? <Badge tone="success">{trustedMaterials.length} trusted internal material{trustedMaterials.length === 1 ? "" : "s"}</Badge> : null}
        </div>
        <h2 className="mt-4 text-5xl font-semibold text-[#f4ead6] font-serif">{topic.title}</h2>
        <p className="mt-4 max-w-3xl text-sm leading-8 text-[#dccfa6]/80">
          This topic remains part of the learning platform first. The library treatment simply organizes saved topics more beautifully while keeping room for materials, roadmaps, exercises, and coding tasks.
        </p>
      </Card>

      <Card className="p-6 border-[#c29f60]/20 bg-[#15171e]/90">
        <h3 className="section-title">Learning materials</h3>
        {visibleMaterials.length ? (
          <div className="mt-5 space-y-5">
            {trustedMaterials.length ? (
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                  Admin/professor verified materials that strongly match this topic
                </div>
                <div className="space-y-3">
                  {trustedMaterials.map((item) => (
                    <MaterialCard key={`${item.url}-${item.source_of_result}`} item={item} />
                  ))}
                </div>
              </div>
            ) : null}

            {otherMaterials.length ? (
              <div>
                <div className="mb-3 text-sm font-medium text-[#dccfa6]/75">Other recommended materials</div>
                <div className="space-y-3">
                  {otherMaterials.map((item) => (
                    <MaterialCard key={`${item.url}-${item.source_of_result}`} item={item} />
                  ))}
                </div>
              </div>
            ) : null}
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
