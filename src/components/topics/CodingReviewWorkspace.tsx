import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Bug, Gauge, Heart, Sparkles, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type TopicCodingWorkspaceProps = {
  topicId: string;
  tasks: string[];
  initialTaskId?: string | null;
};

type SupportedLanguage = "python" | "typescript" | "cpp" | "java";
type ReviewCategory = "Bugs" | "Edge Cases" | "Optimizations" | "Styling/Indentation";

type MockTask = {
  id: string;
  kind: "Task" | "Problem";
  title: string;
  prompt: string;
  starter: Record<SupportedLanguage, string>;
};

type MockFinding = {
  id: string;
  category: ReviewCategory;
  title: string;
  detail: string;
  lineStart: number;
  lineEnd: number;
  confidence: number;
  severity: "High" | "Medium" | "Low";
  example: string;
  exactMapping: boolean;
};

type ReviewPayload = {
  language: SupportedLanguage;
  code: string;
  taskId: string;
  findings: Record<ReviewCategory, MockFinding[]>;
  reviewedAt: string;
};

const CATEGORY_ORDER: ReviewCategory[] = ["Bugs", "Edge Cases", "Optimizations", "Styling/Indentation"];

const LANGUAGES: Array<{ value: SupportedLanguage; label: string; supported: boolean }> = [
  { value: "python", label: "Python", supported: true },
  { value: "typescript", label: "TypeScript", supported: true },
  { value: "cpp", label: "C++", supported: true },
  { value: "java", label: "Java", supported: false },
];

const TASK_STARTERS: Record<SupportedLanguage, string> = {
  python: `def solve():
    # Implement your solution here.
    pass`,
  typescript: `export function solve(): void {
  // Implement your solution here.
}`,
  cpp: `void solve() {
    // Implement your solution here.
}`,
  java: `public void solve() {
    // Implement your solution here.
}`,
};

export function createCodingWorkspaceTasks(taskTitles: string[]): MockTask[] {
  return taskTitles.filter(Boolean).map((title, index) => ({
    id: `topic-task-${index}`,
    kind: index % 2 === 0 ? "Task" : "Problem",
    title,
    prompt: title,
    starter: TASK_STARTERS,
  }));
}

function storageKey(topicId: string, taskId: string, language: SupportedLanguage) {
  return `apollo-code-draft:${topicId}:${taskId}:${language}`;
}

function severityTone(severity: MockFinding["severity"]) {
  switch (severity) {
    case "High":
      return "border-rose-500/30 bg-rose-950/35 text-rose-200";
    case "Medium":
      return "border-amber-500/30 bg-amber-950/35 text-amber-200";
    default:
      return "border-sky-500/30 bg-sky-950/35 text-sky-200";
  }
}

function categoryIcon(category: ReviewCategory) {
  switch (category) {
    case "Bugs":
      return <Bug className="h-4 w-4" />;
    case "Edge Cases":
      return <AlertTriangle className="h-4 w-4" />;
    case "Optimizations":
      return <Gauge className="h-4 w-4" />;
    default:
      return <Wand2 className="h-4 w-4" />;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightLine(line: string, language: SupportedLanguage) {
  const keywords: Record<SupportedLanguage, string[]> = {
    python: ["def", "return", "for", "if", "in", "len", "range", "continue"],
    typescript: ["export", "function", "const", "let", "return", "for", "if", "continue", "new"],
    cpp: ["int", "return", "for", "if", "vector", "continue"],
    java: ["public", "int", "return", "if", "for", "new"],
  };

  const escaped = escapeHtml(line);
  const keywordPattern = new RegExp(`\\b(${keywords[language].join("|")})\\b`, "g");
  return escaped
    .replace(/("[^"]*"|'[^']*')/g, '<span class="text-emerald-300">$1</span>')
    .replace(/\b(\d+)\b/g, '<span class="text-sky-300">$1</span>')
    .replace(keywordPattern, '<span class="text-[#f0c879]">$1</span>');
}

function lineInRange(line: number, finding: MockFinding) {
  return line >= finding.lineStart && line <= finding.lineEnd;
}

function buildMockReview(language: SupportedLanguage, code: string, taskId: string): ReviewPayload {
  const languageName = LANGUAGES.find((item) => item.value === language)?.label ?? language;
  const commonDetail = `This ${languageName}-focused review is a frontend mock that uses the active task and topic context.`;
  return {
    language,
    code,
    taskId,
    reviewedAt: new Date().toISOString(),
    findings: {
      Bugs: [
        {
          id: "bug-unreachable",
          category: "Bugs",
          title: "Impossible states return a huge sentinel instead of -1",
          detail: `${commonDetail} The solution leaves unreachable states as a large number, so the final answer can be incorrect for impossible targets.`,
          lineStart: 1,
          lineEnd: 8,
          confidence: 0.91,
          severity: "High",
          example: "coins = [4, 6], target = 3 should return -1.",
          exactMapping: true,
        },
      ],
      "Edge Cases": [
        {
          id: "edge-empty",
          category: "Edge Cases",
          title: "Base case for target 0 is not made explicit",
          detail: "The current draft works accidentally for some inputs, but the editor review flags the missing explicit base condition as fragile.",
          lineStart: 1,
          lineEnd: 3,
          confidence: 0.72,
          severity: "Medium",
          example: "target = 0 should return 0 immediately.",
          exactMapping: true,
        },
      ],
      Optimizations: [
        {
          id: "opt-skip",
          category: "Optimizations",
          title: "Sort or filter candidates before the inner loop",
          detail: "If the coin list is large, pre-filtering values larger than the target or breaking early after sorting can reduce wasted checks.",
          lineStart: 4,
          lineEnd: 7,
          confidence: 0.58,
          severity: "Low",
          example: "Skip any coin greater than the current amount.",
          exactMapping: false,
        },
      ],
      "Styling/Indentation": [
        {
          id: "style-name",
          category: "Styling/Indentation",
          title: "Use a named sentinel or helper constant",
          detail: "Replacing magic numbers like 10**9 or MAX_SAFE_INTEGER with a named constant makes the review easier to follow and prepares the code for compiler checks later.",
          lineStart: 3,
          lineEnd: 5,
          confidence: 0.67,
          severity: "Low",
          example: "const INF = Number.MAX_SAFE_INTEGER;",
          exactMapping: true,
        },
      ],
    },
  };
}

function EditorSurface({
  code,
  language,
  onChange,
  hoveredFinding,
}: {
  code: string;
  language: SupportedLanguage;
  onChange: (value: string) => void;
  hoveredFinding: MockFinding | null;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const overlayRef = useRef<HTMLPreElement | null>(null);
  const lines = code.split("\n");

  return (
    <Card className="overflow-hidden rounded-[28px] border-[#c29f60]/14 bg-[linear-gradient(180deg,#171920,#12141a)] p-0">
      <div className="flex items-center justify-between border-b border-[#c29f60]/10 px-4 py-2.5">
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-[#b89a68]">
          <span>Editor</span>
          <span className="h-1 w-1 rounded-full bg-[#c29f60]/40" />
          <span>{language}</span>
        </div>
        <p className="text-xs text-[#dccfa6]/62">Draft is saved locally while you type.</p>
      </div>
      <div className="relative min-h-[440px] bg-[#111318]">
        <pre
          ref={overlayRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-auto whitespace-pre px-4 py-3.5 font-mono text-sm leading-7 text-[#f3ead2]"
        >
          {lines.map((line, index) => {
            const lineNumber = index + 1;
            const highlighted = hoveredFinding ? lineInRange(lineNumber, hoveredFinding) : false;
            return (
              <div
                key={`overlay-${lineNumber}`}
                className={`grid grid-cols-[44px_minmax(0,1fr)] rounded-md ${highlighted ? "bg-amber-500/10" : ""}`}
              >
                <span className="pr-3 text-right text-[#6d7485]">{lineNumber}</span>
                <span dangerouslySetInnerHTML={{ __html: highlightLine(line || " ", language) }} />
              </div>
            );
          })}
        </pre>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(event) => onChange(event.target.value)}
          onScroll={(event) => {
            if (overlayRef.current) {
              overlayRef.current.scrollTop = event.currentTarget.scrollTop;
              overlayRef.current.scrollLeft = event.currentTarget.scrollLeft;
            }
          }}
          spellCheck={false}
          wrap="off"
          className="relative z-10 h-[440px] w-full resize-none overflow-auto whitespace-pre bg-transparent pr-4 pl-[60px] py-3.5 font-mono text-sm leading-7 text-transparent caret-[#f4ead6] outline-none selection:bg-[#c29f60]/30"
        />
      </div>
    </Card>
  );
}

function ReviewPanel({
  review,
  stale,
  hoveredFindingId,
  onHover,
  onLeave,
}: {
  review: ReviewPayload | null;
  stale: boolean;
  hoveredFindingId: string | null;
  onHover: (finding: MockFinding) => void;
  onLeave: () => void;
}) {
  return (
    <Card className="rounded-[28px] border-[#c29f60]/14 bg-[linear-gradient(180deg,#171920,#13151b)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#b89a68]">AI Review</p>
          <h3 className="mt-1.5 text-xl font-semibold text-[#f4ead6]">Structured feedback</h3>
        </div>
        {review ? <Badge tone={stale ? "warning" : "success"}>{stale ? "Feedback may be stale" : "Current review"}</Badge> : null}
      </div>

      {!review ? (
        <p className="mt-4 text-sm leading-6 text-[#dccfa6]/72">Submit code to see categorized Bugs, Edge Cases, Optimizations, and Styling/Indentation feedback.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {CATEGORY_ORDER.map((category) => {
            const items = review.findings[category];
            return (
              <div key={category} className="rounded-[22px] border border-[#c29f60]/10 bg-[#111318]/70 p-3.5">
                <div className="flex items-center gap-2 text-[#f4ead6]">
                  {categoryIcon(category)}
                  <h4 className="text-lg font-semibold">{category}</h4>
                  <span className="text-sm text-[#cdb58a]/72">{items.length}</span>
                </div>
                {items.length ? (
                  <div className="mt-3 space-y-2.5">
                    {items.map((finding) => (
                      <button
                        key={finding.id}
                        type="button"
                        onMouseEnter={() => onHover(finding)}
                        onFocus={() => onHover(finding)}
                        onMouseLeave={onLeave}
                        onBlur={onLeave}
                        className={`w-full rounded-[18px] border px-3.5 py-3.5 text-left transition ${
                          hoveredFindingId === finding.id ? "border-[#c29f60]/35 bg-[#201b17]" : "border-[#c29f60]/10 bg-[#171920] hover:bg-[#1d2028]"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold text-[#f4ead6]">{finding.title}</p>
                              <p className="mt-1.5 text-sm leading-6 text-[#dccfa6]/76">{finding.detail}</p>
                          </div>
                          <Badge tone="default" className={severityTone(finding.severity)}>{finding.severity}</Badge>
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-[#cdb58a]/72">
                          <span>Lines {finding.lineStart}-{finding.lineEnd}</span>
                          <span>Confidence {(finding.confidence * 100).toFixed(0)}%</span>
                          <span>{finding.exactMapping ? "Exact mapping" : "Approximate mapping"}</span>
                        </div>
                        <div className="mt-2.5 rounded-2xl border border-[#c29f60]/10 bg-[#111318] px-3 py-2.5 text-sm text-[#e5d7b9]/78">
                          Example: {finding.example}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[#dccfa6]/64">No findings in this category for the current mock review.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function CodingReviewWorkspace({ topicId, tasks, initialTaskId = null }: TopicCodingWorkspaceProps) {
  const availableTasks = useMemo(() => createCodingWorkspaceTasks(tasks), [tasks]);
  const [selectedTaskId, setSelectedTaskId] = useState(initialTaskId ?? availableTasks[0]?.id ?? "");
  const [language, setLanguage] = useState<SupportedLanguage>("python");
  const [code, setCode] = useState("");
  const [review, setReview] = useState<ReviewPayload | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [stale, setStale] = useState(false);
  const [hoveredFinding, setHoveredFinding] = useState<MockFinding | null>(null);

  const selectedTask = availableTasks.find((task) => task.id === selectedTaskId) ?? availableTasks[0];
  const unsupportedLanguage = !LANGUAGES.find((item) => item.value === language)?.supported;

  useEffect(() => {
    if (!availableTasks.length) return;
    if (initialTaskId && availableTasks.some((task) => task.id === initialTaskId)) {
      setSelectedTaskId(initialTaskId);
      return;
    }
    if (!availableTasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(availableTasks[0].id);
    }
  }, [availableTasks, initialTaskId, selectedTaskId]);

  useEffect(() => {
    if (!selectedTask) return;
    const savedDraft = localStorage.getItem(storageKey(topicId, selectedTask.id, language));
    if (savedDraft != null) {
      setCode(savedDraft);
    } else {
      setCode(selectedTask.starter[language]);
    }
    setReview(null);
    setStale(false);
    setHoveredFinding(null);
  }, [language, selectedTask, topicId]);

  useEffect(() => {
    if (!selectedTask) return;
    localStorage.setItem(storageKey(topicId, selectedTask.id, language), code);
  }, [code, language, selectedTask, topicId]);

  const reviewCount = review
    ? CATEGORY_ORDER.reduce((count, category) => count + review.findings[category].length, 0)
    : 0;

  if (!selectedTask) {
    return (
      <Card className="rounded-[24px] border-[#c29f60]/14 bg-[linear-gradient(180deg,#171920,#13151b)] p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[#b89a68]">Task workspace</p>
        <h3 className="mt-1.5 text-xl font-semibold text-[#f4ead6]">No coding tasks available</h3>
        <p className="mt-2 text-sm leading-6 text-[#dccfa6]/72">
          Generated or saved topic tasks will appear here when they are available.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)] xl:items-start">
        <div className="space-y-3">
          <Card className="rounded-[24px] border-[#c29f60]/14 bg-[linear-gradient(180deg,#171920,#13151b)] p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] text-[#b89a68]">{selectedTask.kind}</p>
                <h3 className="mt-1.5 text-xl font-semibold text-[#f4ead6]">{selectedTask.title}</h3>
                <p className="mt-1.5 max-w-3xl text-sm leading-5 text-[#dccfa6]/74 xl:line-clamp-2">{selectedTask.prompt}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
                <Badge tone="warning">Frontend only</Badge>
                <Badge tone="info">{reviewCount} findings</Badge>
                {stale ? <Badge tone="warning">Review stale after edits</Badge> : null}
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-xs uppercase tracking-[0.18em] text-[#b89a68] shrink-0">
                  Language
                  <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value as SupportedLanguage)}
                    className="mt-1.5 block rounded-2xl border border-[#c29f60]/16 bg-[#111318] px-4 py-2.5 text-sm text-[#f4ead6] outline-none"
                  >
                    {LANGUAGES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}{item.supported ? "" : " (unsupported)"}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  variant="secondary"
                  disabled={unsupportedLanguage || reviewing}
                  className="rounded-full border-[#c29f60]/18 bg-[#1a1d24] text-[#f4ead6] hover:bg-[#21252e] disabled:opacity-50"
                  onClick={() => {
                    setReviewing(true);
                    setHoveredFinding(null);
                    window.setTimeout(() => {
                      setReview(buildMockReview(language, code, selectedTask.id));
                      setReviewing(false);
                      setStale(false);
                    }, 850);
                  }}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {reviewing ? "Reviewing..." : "Submit for AI review"}
                </Button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone={unsupportedLanguage ? "warning" : reviewing ? "info" : review ? "success" : "default"}>
                {unsupportedLanguage ? "Unsupported language" : reviewing ? "Review in progress" : review ? "Review ready" : "Awaiting submission"}
              </Badge>
              <span className="text-sm leading-5 text-[#dccfa6]/70 xl:text-right">
                {unsupportedLanguage
                  ? "Select a supported language to submit this mock review."
                  : reviewing
                    ? "Results will appear in categorized sections shortly."
                    : "Hover a suggestion to highlight its related code lines."}
              </span>
            </div>
          </Card>

          <EditorSurface
            code={code}
            language={language}
            hoveredFinding={hoveredFinding}
            onChange={(value) => {
              setCode(value);
              if (review && value !== review.code) {
                setStale(true);
              }
            }}
          />
        </div>

        <ReviewPanel
          review={review}
          stale={stale}
          hoveredFindingId={hoveredFinding?.id ?? null}
          onHover={setHoveredFinding}
          onLeave={() => setHoveredFinding(null)}
        />
      </div>
    </div>
  );
}
