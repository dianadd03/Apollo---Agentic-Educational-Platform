import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createCodingWorkspaceTasks } from "@/components/topics/CodingReviewWorkspace";
import { ProblemsSection } from "@/components/problems/ProblemsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { resolveMaterialUrl } from "@/lib/materialUrls";
import { api } from "@/services/api";
import type { AggregatedProblem, GeneratedFoundationalTask, ProblemListMetadata, SearchResult, TopicDetail } from "@/types/models";

const MATERIALS_PER_PAGE = 5;
const MATERIAL_LEVELS = ["beginner", "intermediate", "advanced", "expert"] as const;
const CONTENT_TABS = ["Materials", "Exercises", "Coding Tasks", "Roadmap"] as const;

type TopicDetailsProps = {
  topic: TopicDetail;
  materials: SearchResult[];
  problems: AggregatedProblem[];
  problemsMeta: ProblemListMetadata | null;
  problemsLoading: boolean;
  problemsError: string | null;
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

function isTrustedSource(item: SearchResult) {
  if (item.source_of_result === "web") return false;
  return ["admin", "professor", "verified", "internal"].includes(item.source_of_result ?? "");
}

function sourceBadgeLabel(item: SearchResult) {
  if (item.source_of_result === "web") {
    return "Web result";
  }
  if (isTrustedSource(item)) {
    return "Trusted internal material";
  }

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
      return "Database result";
    case "internal":
      return "Trusted internal material";
    default:
      return item.is_internal ? "Database result" : "External";
  }
}

function sourceBadgeTone(item: SearchResult): "success" | "warning" | "info" | "default" {
  switch (item.source_of_result) {
    case "admin":
    case "professor":
    case "verified":
    case "internal":
      return "success";
    case "promoted":
    case "db_internal":
      return "info";
    case "web":
      return "warning";
    default:
      return "default";
  }
}

type ReviewData = {
  format?: string;
  title?: string;
  material_quality_score?: number;
  ease_of_understanding_score?: number;
  level?: string;
};

function parseReviewData(item: SearchResult): ReviewData | null {
  const value = item.review_data;
  if (!value || typeof value !== "object") return null;
  return value as ReviewData;
}

function scoreTone(value?: number): string {
  if (typeof value !== "number") return "bg-[#1f2430] text-[#dccfa6]";
  if (value >= 80) return "bg-emerald-950/70 text-emerald-200";
  if (value >= 60) return "bg-amber-950/70 text-amber-200";
  return "bg-rose-950/70 text-rose-200";
}

function levelRank(level?: string): number {
  switch ((level ?? "").toLowerCase()) {
    case "beginner":
      return 0;
    case "intermediate":
      return 1;
    case "advanced":
      return 2;
    case "expert":
      return 3;
    default:
      return 4;
  }
}

function cleanSnippetText(snippet?: string | null): string {
  if (!snippet) return "";
  return snippet.replace(/Review score\s+\d+\s*\/\s*100\.?/gi, "").replace(/\s{2,}/g, " ").trim();
}

function normalizeMaterialType(item: SearchResult, review: ReviewData | null): string {
  const url = (item.url ?? "").toLowerCase();
  const source = (item.source ?? "").toLowerCase();
  const reviewFormat = (review?.format ?? "").toLowerCase();
  const rawType = (item.type ?? "").toLowerCase();

  if (
    url.includes("youtube.com") ||
    url.includes("youtu.be") ||
    source.includes("youtube") ||
    reviewFormat.includes("video") ||
    rawType === "video"
  ) {
    return "video";
  }

  if (rawType === "book" || reviewFormat.includes("book")) {
    return "book";
  }

  if (rawType === "documentation" || source.includes("docs") || reviewFormat.includes("documentation")) {
    return "documentation";
  }

  if (
    rawType === "tutorial" ||
    reviewFormat.includes("tutorial") ||
    reviewFormat.includes("course")
  ) {
    return "tutorial";
  }

  if (
    source.includes("wikipedia") ||
    source.includes("medium") ||
    source.includes("substack") ||
    source.includes("blog") ||
    rawType === "article" ||
    reviewFormat.includes("article")
  ) {
    return "article";
  }

  if (url.startsWith("http")) {
    return "website";
  }

  return rawType || "website";
}

function MaterialCard({ item }: { item: SearchResult }) {
  const href = resolveMaterialUrl(item.url);
  const review = parseReviewData(item);
  const sourceName = item.source?.replace(/^www\./, "") ?? "Unknown source";
  const snippetText = cleanSnippetText(item.snippet);
  const materialType = normalizeMaterialType(item, review);

  return (
    <a
      key={item.url}
      href={href || "#"}
      target="_blank"
      rel="noreferrer"
      className="block rounded-[22px] border border-[#c29f60]/14 bg-[linear-gradient(180deg,#1b1d24,#171920)] px-4 py-4 transition hover:bg-[linear-gradient(180deg,#22252d,#1a1c23)] group"
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold leading-6 text-[#f4ead6] transition-colors group-hover:text-[#c29f60]">{item.title}</p>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#a3835b]">
            <Badge tone={sourceBadgeTone(item)} className="border-[#c29f60]/10 px-2 py-0.5 text-[10px]">
              {sourceBadgeLabel(item)}
            </Badge>
            {item.is_verified ? <Badge tone="success" className="px-2 py-0.5 text-[10px]">Trusted</Badge> : null}
            <span>{materialType}</span>
            <span className="h-1 w-1 rounded-full bg-[#c29f60]/40" />
            <span>{sourceName}</span>
          </div>
          {snippetText ? <p className="mt-3 max-w-3xl text-sm leading-6 text-[#dccfa6]/74 line-clamp-2">{snippetText}</p> : null}
        </div>

        <div className="flex xl:flex-none xl:justify-end">
          <div className="inline-flex flex-wrap items-center justify-end gap-2">
            <div
              title="Material Quality"
              aria-label="Material Quality"
              className={`flex h-[56px] w-[56px] items-center justify-center rounded-full border border-[#c29f60]/16 text-center ${scoreTone(review?.material_quality_score)}`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">Q {typeof review?.material_quality_score === "number" ? review.material_quality_score : "N/A"}</span>
            </div>
            <div
              title="Ease of Understanding"
              aria-label="Ease of Understanding"
              className={`flex h-[56px] w-[56px] items-center justify-center rounded-full border border-[#c29f60]/16 text-center ${scoreTone(review?.ease_of_understanding_score)}`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">E {typeof review?.ease_of_understanding_score === "number" ? review.ease_of_understanding_score : "N/A"}</span>
            </div>
            {typeof item.like_count === "number" ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-[#dccfa6]/68">
                <Heart className="h-3.5 w-3.5" />
                {item.like_count}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </a>
  );
}

function GeneratedTaskCard({
  task,
  index,
  onOpenCodeReview,
}: {
  task: GeneratedFoundationalTask;
  index: number;
  onOpenCodeReview: () => void;
}) {
  return (
    <Card className="rounded-[24px] border border-[#c29f60]/12 bg-[#12141a]/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[#b89a68]">Problem {index + 1}</p>
          <h4 className="mt-2 text-xl font-semibold text-[#f4ead6]">{task.title}</h4>
        </div>
        <Badge tone="info">Generated</Badge>
      </div>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#dccfa6]/78">{task.task}</p>

      <div className="mt-5 space-y-4">
        <p className="text-xs uppercase tracking-[0.22em] text-[#b89a68]">Examples</p>
        {task.examples.map((example, exampleIndex) => (
          <div key={`${task.title}-${exampleIndex}`} className="rounded-[20px] border border-[#c29f60]/10 bg-[#171920] p-4">
            <p className="text-sm font-semibold text-[#f4ead6]">Example {exampleIndex + 1}</p>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div>
                <p className="mb-1.5 text-[11px] uppercase tracking-[0.18em] text-[#a3835b]">Input</p>
                <pre className="min-h-[56px] whitespace-pre-wrap rounded-[14px] border border-[#c29f60]/10 bg-[#0f1117] p-3 text-xs leading-5 text-[#f4ead6]">{example.input}</pre>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] uppercase tracking-[0.18em] text-[#a3835b]">Output</p>
                <pre className="min-h-[56px] whitespace-pre-wrap rounded-[14px] border border-[#c29f60]/10 bg-[#0f1117] p-3 text-xs leading-5 text-[#f4ead6]">{example.output}</pre>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="secondary"
        className="mt-5 rounded-full border-[#c29f60]/18 bg-[#171920] text-[#f4ead6] hover:bg-[#1f232d]"
        onClick={onOpenCodeReview}
      >
        Open code review
      </Button>
    </Card>
  );
}

export function TopicDetails({ topic, materials, problems, problemsMeta, problemsLoading, problemsError }: TopicDetailsProps) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<(typeof CONTENT_TABS)[number]>("Materials");
  const [selectedLevel, setSelectedLevel] = useState<(typeof MATERIAL_LEVELS)[number]>("beginner");
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedFoundationalTask[]>([]);
  const [taskTopic, setTaskTopic] = useState<string | null>(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const codingTasks = useMemo(() => createCodingWorkspaceTasks(topic.coding_tasks), [topic.coding_tasks]);
  const sortedMaterials = useMemo(() => [...materials].sort((left, right) => {
    const leftReview = parseReviewData(left);
    const rightReview = parseReviewData(right);

    const levelDifference = levelRank(leftReview?.level) - levelRank(rightReview?.level);
    if (levelDifference !== 0) return levelDifference;

    const leftEase = typeof leftReview?.ease_of_understanding_score === "number" ? leftReview.ease_of_understanding_score : -1;
    const rightEase = typeof rightReview?.ease_of_understanding_score === "number" ? rightReview.ease_of_understanding_score : -1;
    return rightEase - leftEase;
  }), [materials]);
  const filteredMaterials = useMemo(
    () => sortedMaterials.filter((item) => (parseReviewData(item)?.level ?? "").toLowerCase() === selectedLevel),
    [selectedLevel, sortedMaterials],
  );

  const totalPages = Math.max(1, Math.ceil(filteredMaterials.length / MATERIALS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * MATERIALS_PER_PAGE;
  const visibleMaterials = filteredMaterials.slice(pageStart, pageStart + MATERIALS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [topic.id, materials.length, selectedLevel, activeTab]);

  useEffect(() => {
    setGeneratedTasks([]);
    setTaskTopic(null);
    setTasksError(null);
    setTasksLoading(false);
  }, [topic.id]);

  const handleGenerateTasks = async () => {
    setTasksLoading(true);
    setTasksError(null);
    try {
      const response = await api.generateFoundationalTasks(topic.title);
      setGeneratedTasks(response.foundational_tasks);
      setTaskTopic(response.topic);
    } catch (err) {
      setTasksError(err instanceof Error ? err.message : "Unable to generate foundational tasks.");
    } finally {
      setTasksLoading(false);
    }
  };

  const tabContent = {
    Materials: (
      <div className="space-y-5">
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max items-end gap-2 border-b-2 border-[#c29f60]/10 px-2">
            {MATERIAL_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setSelectedLevel(level)}
                className={`relative min-w-[160px] rounded-t-[22px] border-[2px] border-b-0 px-5 py-3 text-left text-lg font-semibold capitalize transition ${
                  level === selectedLevel
                    ? "z-10 -mb-[2px] border-[#c29f60]/45 bg-[linear-gradient(180deg,#2b241b,#1b1d24)] text-[#f4ead6] shadow-[0_-4px_14px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)]"
                    : "border-[#c29f60]/14 bg-[linear-gradient(180deg,#191b22,#13151b)] text-[#dccfa6]/72 hover:bg-[linear-gradient(180deg,#21242d,#171920)] hover:text-[#f4ead6]"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[0_28px_28px_28px] border-[3px] border-[#c29f60]/16 bg-[linear-gradient(180deg,#1b1d24,#15171e)] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#c29f60]/10 pb-4 text-sm text-[#dccfa6]/80">
            <span className="font-medium">
              {selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)} materials
            </span>
            <span>
              {filteredMaterials.length
                ? `Showing ${pageStart + 1}-${Math.min(pageStart + MATERIALS_PER_PAGE, filteredMaterials.length)} of ${filteredMaterials.length}`
                : "No reviewed materials in this level"}
            </span>
          </div>

          {filteredMaterials.length ? (
            <div className="space-y-4">
              {visibleMaterials.map((item) => (
                <MaterialCard key={`${item.url}-${item.source_of_result}`} item={item} />
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] border border-[#c29f60]/10 bg-[#12141a]/60 px-6 py-10 text-center text-sm text-[#dccfa6]/72">
              No reviewed web materials are available for the {selectedLevel} level yet.
            </div>
          )}

          {totalPages > 1 ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t-2 border-[#c29f60]/10 pt-4">
              <Button
                variant="secondary"
                className="rounded-full border-[#c29f60]/18 bg-[#12141a]/60 text-[#f4ead6] hover:bg-[#1c1e26]"
                disabled={safePage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    aria-label={`Go to materials page ${page}`}
                    onClick={() => setCurrentPage(page)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition ${
                      page === safePage
                        ? "border-[#c29f60] bg-[#c29f60] text-[#12141a]"
                        : "border-[#c29f60]/18 bg-[#12141a]/60 text-[#f4ead6] hover:bg-[#1c1e26]"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <Button
                variant="secondary"
                className="rounded-full border-[#c29f60]/18 bg-[#12141a]/60 text-[#f4ead6] hover:bg-[#1c1e26]"
                disabled={safePage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    ),
    Exercises: (
      <ProblemsSection
        problems={problems}
        metadata={problemsMeta}
        loading={problemsLoading}
        error={problemsError}
      />
    ),
    "Coding Tasks": (
      <div className="space-y-5">
        <Card className="rounded-[30px] border-[#c29f60]/14 bg-[linear-gradient(180deg,#1a1d24,#14161d)] p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#b89a68]">Foundational task agent</p>
              <h3 className="mt-2 text-3xl font-semibold text-[#f4ead6]">Generate focused coding problems</h3>
            </div>
            <Button
              variant="secondary"
              className="self-start rounded-full border-[#c29f60]/18 bg-[#171920] text-[#f4ead6] hover:bg-[#1f232d] md:self-auto"
              disabled={tasksLoading}
              onClick={() => void handleGenerateTasks()}
            >
              {tasksLoading ? "Generating tasks..." : generatedTasks.length ? "Regenerate tasks" : "Generate Foundational Tasks"}
            </Button>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#dccfa6]/74">
            Create programming problems for {topic.title}, with examples formatted for quick practice.
          </p>
        </Card>

        {tasksError ? (
          <Card className="rounded-[24px] border-rose-900 bg-rose-950/40 p-4 text-sm text-rose-300">
            {tasksError}
          </Card>
        ) : null}

        {generatedTasks.length ? (
          <div className="space-y-4">
            {taskTopic ? <p className="text-sm text-[#dccfa6]/70">Generated for {taskTopic}</p> : null}
            {generatedTasks.map((task, index) => (
              <GeneratedTaskCard
                key={`${task.title}-${index}`}
                task={task}
                index={index}
                onOpenCodeReview={() =>
                  navigate(`/topics/${topic.id}/coding-review`, {
                    state: {
                      topic,
                    },
                  })
                }
              />
            ))}
          </div>
        ) : (
          <Card className="rounded-[24px] border border-[#c29f60]/12 bg-[#12141a]/60 p-6 text-sm leading-7 text-[#dccfa6]/72">
            No generated foundational tasks yet. Use the button above when you are ready to create practice problems for this topic.
          </Card>
        )}

        {codingTasks.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {codingTasks.map((task) => (
              <Card key={task.id} className="rounded-[24px] border border-[#c29f60]/12 bg-[#12141a]/60 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#b89a68]">{task.kind}</p>
                    <h4 className="mt-2 text-xl font-semibold text-[#f4ead6]">{task.title}</h4>
                  </div>
                  <Badge tone="warning">Full page</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#dccfa6]/76">{task.prompt}</p>
                <Button
                  variant="secondary"
                  className="mt-4 rounded-full border-[#c29f60]/18 bg-[#171920] text-[#f4ead6] hover:bg-[#1f232d]"
                  onClick={() =>
                    navigate(`/topics/${topic.id}/coding-review?task=${task.id}`, {
                      state: {
                        topic,
                      },
                    })
                  }
                >
                  Open code review
                </Button>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    ),
    Roadmap: <FutureSection title="Roadmap" items={topic.roadmap} emptyLabel="Roadmap steps will appear here once backend orchestration is connected." />,
  } as const;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="rounded-[40px] border-[3px] border-[#c29f60]/14 bg-[linear-gradient(180deg,#1b1d24,#15171e)] p-5 md:p-6">
        <div className="space-y-5">
          {tabContent[activeTab]}
        </div>
      </Card>

      <Card className="self-start overflow-hidden rounded-[34px] border-[3px] border-[#c29f60]/14 bg-[linear-gradient(180deg,#1c1e26,#15171e)] p-0">
        <div>
          {CONTENT_TABS.map((tab, index) => (
            <div
              key={tab}
              className={index === CONTENT_TABS.length - 1 ? "" : "border-b border-[#c29f60]/10"}
            >
              <button
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`w-full px-5 py-5 text-left text-xl font-semibold transition ${
                  tab === activeTab
                    ? "bg-[#2b221d] text-[#f4ead6]"
                    : "text-[#dccfa6]/82 hover:bg-[#1c1e26] hover:text-[#f4ead6]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span>{tab}</span>
                  <span className={`h-2.5 w-2.5 rounded-full ${tab === activeTab ? "bg-[#c29f60]" : "bg-[#c29f60]/20"}`} />
                </div>
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
