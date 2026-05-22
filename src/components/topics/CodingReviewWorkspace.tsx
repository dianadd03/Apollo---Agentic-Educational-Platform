import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Lightbulb, Sparkles, TestTube2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/services/api";
import type { CodeReviewResponse, GeneratedFoundationalTask } from "@/types/models";

type TopicCodingWorkspaceProps = {
  topicId: string;
  tasks: GeneratedFoundationalTask[];
  initialTaskId?: string | null;
};

type SupportedLanguage = "python" | "typescript" | "cpp" | "java";
type MockTask = {
  id: string;
  kind: "Task" | "Problem";
  title: string;
  prompt: string;
  statement: string;
  examples: GeneratedFoundationalTask["examples"];
  starter: Record<SupportedLanguage, string>;
};

type LineRange = {
  lineStart: number;
  lineEnd: number;
};

type ReviewSeverity = "critical" | "important" | "nice" | "tests";

type StructuredReviewIssue = {
  id: string;
  title: string;
  lineStart: number | null;
  lineEnd: number | null;
  explanation: string;
  suggestion: string | null;
  rawText: string;
};

type StructuredReviewSection = {
  id: string;
  title: string;
  severity: ReviewSeverity;
  items: StructuredReviewIssue[];
};

type StructuredReview = {
  sections: StructuredReviewSection[];
};

type ReviewPayload = {
  language: SupportedLanguage;
  code: string;
  taskId: string;
  markdown: string;
  model: string;
  reviewedAt: string;
};

const REVIEW_SECTION_CONFIG = [
  { id: "critical", title: "Critical issues", heading: "Critical issues (must-fix)", severity: "critical" },
  { id: "important", title: "Important improvements", heading: "Important improvements (should-fix)", severity: "important" },
  { id: "nice", title: "Nice-to-haves", heading: "Nice-to-haves", severity: "nice" },
  { id: "tests", title: "Suggested tests", heading: "Suggested tests (with expected results)", severity: "tests" },
] as const satisfies ReadonlyArray<{ id: string; title: string; heading: string; severity: ReviewSeverity }>;

const LANGUAGES: Array<{ value: SupportedLanguage; label: string; supported: boolean }> = [
  { value: "python", label: "Python", supported: true },
  { value: "typescript", label: "TypeScript", supported: true },
  { value: "cpp", label: "C++", supported: true },
  { value: "java", label: "Java", supported: true },
];

const FALLBACK_TASKS: MockTask[] = [
  {
    id: "task-dp-intro",
    kind: "Task",
    title: "Minimum coins to reach a target sum",
    prompt: "Return the minimum number of coins needed to make a target sum. If impossible, return -1.",
    statement: "Return the minimum number of coins needed to make a target sum. If impossible, return -1.",
    examples: [],
    starter: {
      python: `def min_coins(coins, target):
    dp = [0] * (target + 1)
    for amount in range(1, target + 1):
        best = 10 ** 9
        for coin in coins:
            if amount - coin >= 0:
                best = min(best, dp[amount - coin] + 1)
        dp[amount] = best
    return dp[target]`,
      typescript: `export function minCoins(coins: number[], target: number): number {
  const dp = new Array(target + 1).fill(0);
  for (let amount = 1; amount <= target; amount += 1) {
    let best = Number.MAX_SAFE_INTEGER;
    for (const coin of coins) {
      if (amount - coin >= 0) {
        best = Math.min(best, dp[amount - coin] + 1);
      }
    }
    dp[amount] = best;
  }
  return dp[target];
}`,
      cpp: `int minCoins(vector<int>& coins, int target) {
    vector<int> dp(target + 1, 0);
    for (int amount = 1; amount <= target; amount++) {
        int best = 1e9;
        for (int coin : coins) {
            if (amount - coin >= 0) {
                best = min(best, dp[amount - coin] + 1);
            }
        }
        dp[amount] = best;
    }
    return dp[target];
}`,
      java: `public int minCoins(int[] coins, int target) {
    return -1;
}`,
    },
  },
  {
    id: "problem-grid-paths",
    kind: "Problem",
    title: "Count paths in a blocked grid",
    prompt: "Count how many valid paths exist from the top-left to bottom-right corner when some cells are blocked.",
    statement: "Count how many valid paths exist from the top-left to bottom-right corner when some cells are blocked.",
    examples: [],
    starter: {
      python: `def count_paths(grid):
    rows = len(grid)
    cols = len(grid[0])
    dp = [[0] * cols for _ in range(rows)]
    dp[0][0] = 1
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 1:
                continue
            if r > 0:
                dp[r][c] += dp[r - 1][c]
            if c > 0:
                dp[r][c] += dp[r][c - 1]
    return dp[rows - 1][cols - 1]`,
      typescript: `export function countPaths(grid: number[][]): number {
  const rows = grid.length;
  const cols = grid[0].length;
  const dp = Array.from({ length: rows }, () => new Array(cols).fill(0));
  dp[0][0] = 1;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (grid[r][c] === 1) continue;
      if (r > 0) dp[r][c] += dp[r - 1][c];
      if (c > 0) dp[r][c] += dp[r][c - 1];
    }
  }

  return dp[rows - 1][cols - 1];
}`,
      cpp: `int countPaths(vector<vector<int>>& grid) {
    int rows = grid.size();
    int cols = grid[0].size();
    vector<vector<int>> dp(rows, vector<int>(cols, 0));
    dp[0][0] = 1;
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == 1) continue;
            if (r > 0) dp[r][c] += dp[r - 1][c];
            if (c > 0) dp[r][c] += dp[r][c - 1];
        }
    }
    return dp[rows - 1][cols - 1];
}`,
      java: `public int countPaths(int[][] grid) {
    return 0;
}`,
    },
  },
];

export function createCodingWorkspaceTasks(tasks: GeneratedFoundationalTask[]): MockTask[] {
  if (!tasks.length) return FALLBACK_TASKS;
  return tasks.map((task, index) => {
    const functionName = slugifyFunctionName(task.title || `task_${index + 1}`);
    const examples = task.examples.length
      ? `\n\nExamples:\n${task.examples.map((example, exampleIndex) => `Example ${exampleIndex + 1}\nInput: ${example.input}\nOutput: ${example.output}`).join("\n\n")}`
      : "";
    const prompt = `${task.task}${examples}`;

    return {
      id: task.id ?? `topic-task-${index}`,
      kind: "Task",
      title: task.title,
      prompt,
      statement: task.task,
      examples: task.examples,
      starter: {
        python: `def ${functionName}(*args):\n    # TODO: implement ${task.title}\n    pass`,
        typescript: `export function ${functionName}(...args: unknown[]): unknown {\n  // TODO: implement ${task.title}\n  return undefined;\n}`,
        cpp: `auto ${functionName}() {\n    // TODO: implement ${task.title}\n}`,
        java: `public Object ${functionName}() {\n    // TODO: implement ${task.title}\n    return null;\n}`,
      },
    };
  });
}

function slugifyFunctionName(value: string): string {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const safe = cleaned || "solve";
  return /^[a-z_]/.test(safe) ? safe : `solve_${safe}`;
}

function storageKey(topicId: string, taskId: string, language: SupportedLanguage) {
  return `apollo-code-draft:${topicId}:${taskId}:${language}`;
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

function lineInRange(line: number, range: LineRange) {
  return line >= range.lineStart && line <= range.lineEnd;
}

function EditorSurface({
  code,
  language,
  onChange,
  hoveredRange,
}: {
  code: string;
  language: SupportedLanguage;
  onChange: (value: string) => void;
  hoveredRange: LineRange | null;
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
            const highlighted = hoveredRange ? lineInRange(lineNumber, hoveredRange) : false;
            return (
              <div
                key={`overlay-${lineNumber}`}
                className={`grid grid-cols-[44px_minmax(0,1fr)] rounded-md ${highlighted ? "bg-amber-500/20 ring-1 ring-amber-400/30" : ""}`}
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

function TaskExamplesPanel({
  taskId,
  examples,
}: {
  taskId: string;
  examples: GeneratedFoundationalTask["examples"];
}) {
  return (
    <div className="rounded-[16px] border border-[#c29f60]/10 bg-[#111318]/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.16em] text-[#b89a68]">Test examples</p>
        <Badge tone={examples.length ? "success" : "default"} className="px-2 py-0.5 text-[10px]">
          {examples.length || 0}
        </Badge>
      </div>
      {examples.length ? (
        <div className="mt-3 space-y-2">
          {examples.slice(0, 3).map((example, index) => (
            <div key={`${taskId}-example-${index}`} className="rounded-[14px] border border-[#c29f60]/10 bg-[#0f1117] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#b89a68]">Example {index + 1}</p>
              <div className="mt-2 grid gap-2 text-xs leading-5 text-[#f4ead6]">
                <pre className="max-h-28 overflow-auto whitespace-pre-wrap rounded-[10px] bg-[#0b0d12] p-2"><span className="text-[#a3835b]">Input: </span>{example.input}</pre>
                <pre className="max-h-28 overflow-auto whitespace-pre-wrap rounded-[10px] bg-[#0b0d12] p-2"><span className="text-[#a3835b]">Output: </span>{example.output}</pre>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-[#dccfa6]/70">No examples were provided for this task.</p>
      )}
    </div>
  );
}

function ReviewPanel({
  review,
  stale,
  error,
  onHoverRange,
  onLeaveRange,
}: {
  review: ReviewPayload | null;
  stale: boolean;
  error: string | null;
  onHoverRange: (range: LineRange) => void;
  onLeaveRange: () => void;
}) {
  const structuredReview = review ? parseStructuredReview(review.markdown) : null;
  const hasVisibleFeedback = structuredReview ? reviewHasVisibleFeedback(structuredReview) : false;

  return (
    <Card className="rounded-[28px] border-[#c29f60]/14 bg-[linear-gradient(180deg,#171920,#13151b)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] xl:sticky xl:top-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#b89a68]">AI Review</p>
          <h3 className="mt-1.5 text-xl font-semibold text-[#f4ead6]">Code Review</h3>
        </div>
        {review ? <Badge tone={stale ? "warning" : "success"}>{stale ? "Feedback may be stale" : "Current review"}</Badge> : null}
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-950/25 px-3 py-2.5 text-sm leading-6 text-rose-100">{error}</div>
      ) : null}

      {!review ? (
        <p className="mt-4 text-sm leading-6 text-[#dccfa6]/72">Submit code to receive categorized feedback for critical issues, improvements, nice-to-haves, and tests.</p>
      ) : (
        <div className="mt-4 max-h-[620px] space-y-3 overflow-y-auto pr-1">
          <div className="text-xs text-[#cdb58a]/72">Reviewed {new Date(review.reviewedAt).toLocaleString()}</div>
          {structuredReview?.sections.map((section) => (
            <ReviewSectionCard
              key={section.id}
              section={section}
              onHoverRange={onHoverRange}
              onLeaveRange={onLeaveRange}
            />
          ))}
          {!hasVisibleFeedback ? <RawReviewCard markdown={review.markdown} /> : null}
        </div>
      )}
    </Card>
  );
}

function RawReviewCard({ markdown }: { markdown: string }) {
  return (
    <section className="rounded-[20px] border border-l-[6px] border-amber-400/55 bg-amber-950/10 p-3.5 shadow-[0_10px_32px_rgba(0,0,0,0.14)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-300/45 bg-amber-950/45 text-amber-100">
            <Lightbulb className="h-4 w-4" />
          </span>
          <h4 className="text-base font-semibold text-[#f4ead6]">Agent feedback</h4>
        </div>
        <Badge tone="warning" className="shrink-0 px-2 py-0.5 text-[10px] tracking-[0.12em]">
          Raw
        </Badge>
      </div>
      <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-[16px] border border-[#c29f60]/10 bg-[#171920] px-3.5 py-3 text-sm leading-6 text-[#dccfa6]/82">
        {markdown || "The reviewer returned an empty response."}
      </pre>
    </section>
  );
}

function ReviewSectionCard({
  section,
  onHoverRange,
  onLeaveRange,
}: {
  section: StructuredReviewSection;
  onHoverRange: (range: LineRange) => void;
  onLeaveRange: () => void;
}) {
  const tone = reviewSeverityTone(section.severity);
  return (
    <section className={`relative overflow-hidden rounded-[20px] border border-l-[6px] bg-[#111318]/72 p-3.5 shadow-[0_10px_32px_rgba(0,0,0,0.14)] ${tone.card}`}>
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-[3px] ${tone.accent}`} />
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${tone.iconWrap}`}>
            {reviewSeverityIcon(section.severity)}
          </span>
          <h4 className="text-base font-semibold text-[#f4ead6]">{section.title}</h4>
        </div>
        <Badge tone={tone.badgeTone} className="shrink-0 px-2 py-0.5 text-[10px] tracking-[0.12em]">
          {tone.label}
        </Badge>
      </div>

      <div className="mt-3 space-y-2">
        {section.items.map((item, index) =>
          section.severity === "tests" && !isEmptyFeedbackItem(item) ? (
            <ReviewTestItem key={item.id} issue={item} index={index} />
          ) : (
            <ReviewIssueItem
              key={item.id}
              issue={item}
              severity={section.severity}
              onHoverRange={onHoverRange}
              onLeaveRange={onLeaveRange}
            />
          ),
        )}
      </div>
    </section>
  );
}

function ReviewTestItem({ issue, index }: { issue: StructuredReviewIssue; index: number }) {
  const details = [issue.explanation, issue.suggestion].filter(Boolean).join(" ");
  const text = details ? `${issue.title}: ${details}` : issue.title;
  const input = extractLabeledValue(text, "input");
  const output = extractLabeledValue(text, "output") ?? extractLabeledValue(text, "expected");
  const compactTitle = stripMarkdown(text.replace(/\b(Input|Output|Expected)\s*:\s*[^.;]+[.;]?/gi, "").trim()) || issue.title;

  return (
    <div className="rounded-[14px] border border-emerald-300/18 bg-[#0f1117] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-100">Test {index + 1}</p>
        {issue.lineStart ? <span className="text-[11px] text-emerald-100/70">{formatLineRange({ lineStart: issue.lineStart, lineEnd: issue.lineEnd ?? issue.lineStart })}</span> : null}
      </div>
      <p className="mt-2 text-sm leading-6 text-[#f4ead6]">{compactTitle}</p>
      {input || output ? (
        <div className="mt-2 grid gap-2 text-xs leading-5 text-[#f4ead6]">
          {input ? <pre className="max-h-28 overflow-auto whitespace-pre-wrap rounded-[10px] bg-[#0b0d12] p-2"><span className="text-emerald-200/80">Input: </span>{input}</pre> : null}
          {output ? <pre className="max-h-28 overflow-auto whitespace-pre-wrap rounded-[10px] bg-[#0b0d12] p-2"><span className="text-emerald-200/80">Expected: </span>{output}</pre> : null}
        </div>
      ) : null}
    </div>
  );
}

function ReviewIssueItem({
  issue,
  severity,
  onHoverRange,
  onLeaveRange,
}: {
  issue: StructuredReviewIssue;
  severity: ReviewSeverity;
  onHoverRange: (range: LineRange) => void;
  onLeaveRange: () => void;
}) {
  const range = issue.lineStart != null && issue.lineEnd != null ? { lineStart: issue.lineStart, lineEnd: issue.lineEnd } : null;
  const tone = reviewSeverityTone(severity);
  const content = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-sm font-semibold leading-5 text-[#f4ead6]">{issue.title}</p>
        {range ? (
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone.lineBadge}`}>
            {formatLineRange(range)}
          </span>
        ) : null}
      </div>
      {issue.explanation ? <p className="mt-1.5 text-sm leading-6 text-[#dccfa6]/78">{issue.explanation}</p> : null}
      {!issue.explanation && !issue.suggestion && issue.rawText !== issue.title ? (
        <p className="mt-1.5 text-sm leading-6 text-[#dccfa6]/78">{issue.rawText}</p>
      ) : null}
      {issue.suggestion ? (
        <div className="mt-2 rounded-[12px] border border-[#c29f60]/10 bg-[#0c0e13] px-3 py-2 text-sm leading-6 text-[#e7d8b8]">
          <span className="font-semibold text-[#f4ead6]">Suggested fix: </span>
          {issue.suggestion}
        </div>
      ) : null}
    </>
  );

  if (!range) {
    return <div className="rounded-[16px] border border-[#c29f60]/10 bg-[#171920] px-3.5 py-3">{content}</div>;
  }

  return (
    <button
      type="button"
      onMouseEnter={() => onHoverRange(range)}
      onFocus={() => onHoverRange(range)}
      onMouseLeave={onLeaveRange}
      onBlur={onLeaveRange}
      className="w-full cursor-pointer rounded-[16px] border border-[#c29f60]/10 bg-[#171920] px-3.5 py-3 text-left transition hover:border-amber-400/25 hover:bg-[#1e211e] focus:border-amber-400/35 focus:bg-[#1e211e] focus:outline-none"
    >
      {content}
    </button>
  );
}

function parseStructuredReview(markdown: string): StructuredReview {
  const bodyByHeading = splitReviewMarkdown(markdown);

  const itemsById: Record<string, StructuredReviewIssue[]> = {};
  REVIEW_SECTION_CONFIG.forEach((section) => {
    itemsById[section.id] = parseReviewItems(bodyByHeading[section.id] ?? "", section.id, section.title);
  });

  const sections = REVIEW_SECTION_CONFIG.map((section) => ({
      id: section.id,
      title: section.title,
      severity: section.severity,
      items: itemsById[section.id] ?? [],
    }));
  const hasRealFeedback = sections.some((section) => section.items.some((item) => !isEmptyFeedbackItem(item)));

  if (!hasRealFeedback && markdown.trim()) {
    return {
      sections: REVIEW_SECTION_CONFIG.map((section) => ({
        id: section.id,
        title: section.title,
        severity: section.severity,
        items: section.id === "important"
          ? parseReviewItems(markdown, section.id, section.title)
        : [emptyReviewItem(section.id)],
      })),
    };
  }

  return { sections };
}

function parseReviewItems(markdown: string, sectionId: string, fallbackTitle: string): StructuredReviewIssue[] {
  const sourceLines = collectReviewItems(markdown);

  if (!sourceLines.length) {
    return [emptyReviewItem(sectionId)];
  }

  return sourceLines.map((line, index) => parseReviewIssue(line, `${sectionId}-${index}`, fallbackTitle));
}

function parseReviewIssue(rawLine: string, id: string, fallbackTitle: string): StructuredReviewIssue {
  const withoutBullet = rawLine.replace(/^[-*]\s+/, "").trim();
  const range = parseLineRange(withoutBullet);
  const withoutLinePrefix = withoutBullet.replace(/^(?:Lines?\s+\d+(?:\s*[-]\s*\d+)?|General)\s*(?::|-|--|->)\s*/i, "").trim();
  const suggestionMatch = withoutLinePrefix.match(/\b(?:Suggested fix|Suggestion|Fix):\s*(.+)$/i);
  const suggestion = suggestionMatch?.[1]?.trim() || null;
  const beforeSuggestion = suggestion && suggestionMatch?.index != null ? withoutLinePrefix.slice(0, suggestionMatch.index).trim() : withoutLinePrefix;
  const [titleCandidate, ...rest] = beforeSuggestion.split(/:\s+/);
  const hasExplicitTitle = rest.length > 0 && titleCandidate.length <= 90;
  const title = stripMarkdown(hasExplicitTitle ? titleCandidate : summarizeText(beforeSuggestion, fallbackTitle));
  const explanation = stripMarkdown(hasExplicitTitle ? rest.join(": ").trim() : "");

  return { id, title, lineStart: range?.lineStart ?? null, lineEnd: range?.lineEnd ?? null, explanation, suggestion: suggestion ? stripMarkdown(suggestion) : null, rawText: stripMarkdown(withoutLinePrefix || withoutBullet) };
}

function splitReviewMarkdown(markdown: string): Record<string, string> {
  const bodyByHeading: Record<string, string> = {};
  let activeSectionId: string | null = null;

  for (const rawLine of markdown.split("\n")) {
    const section = sectionFromHeading(rawLine);
    if (section) {
      activeSectionId = section.id;
      bodyByHeading[activeSectionId] = bodyByHeading[activeSectionId] ?? "";
      continue;
    }
    if (!activeSectionId) continue;
    bodyByHeading[activeSectionId] = `${bodyByHeading[activeSectionId]}\n${rawLine}`.trim();
  }

  return bodyByHeading;
}

function sectionFromHeading(line: string) {
  const normalized = normalizeHeading(line);
  if (!normalized) return null;
  return REVIEW_SECTION_CONFIG.find((section) => {
    const heading = normalizeHeading(section.heading);
    const title = normalizeHeading(section.title);
    return normalized === heading || normalized === title || normalized.startsWith(`${title} `);
  }) ?? null;
}

function normalizeHeading(value: string) {
  return value
    .replace(/^[-*]\s*/, "")
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/:$/, "")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function collectReviewItems(markdown: string) {
  const items: string[] = [];
  let current: string[] = [];

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("```") || sectionFromHeading(line)) continue;
    const isBullet = /^([-*]|\d+[.)])\s+/.test(line);
    if (isBullet) {
      if (current.length) items.push(current.join(" "));
      current = [line.replace(/^([-*]|\d+[.)])\s+/, "").trim()];
      continue;
    }
    if (current.length) {
      current.push(line);
    } else {
      items.push(line);
    }
  }

  if (current.length) items.push(current.join(" "));
  return items;
}

function isEmptyFeedbackItem(item: StructuredReviewIssue) {
  const text = `${item.title} ${item.rawText}`.toLowerCase();
  return text.startsWith("no feedback") || text.startsWith("no specific feedback") || text.includes("no specific feedback provided");
}

function emptyReviewItem(sectionId: string): StructuredReviewIssue {
  return { id: `${sectionId}-empty`, title: "No feedback in this category", lineStart: null, lineEnd: null, explanation: "", suggestion: null, rawText: "" };
}

function reviewHasVisibleFeedback(review: StructuredReview) {
  return review.sections.some((section) => section.items.some((item) => !isEmptyFeedbackItem(item)));
}

function extractLabeledValue(text: string, label: "input" | "output" | "expected") {
  const match = text.match(new RegExp(`${label}\\s*:\\s*([^.;]+)`, "i"));
  return match?.[1]?.trim() ?? null;
}

function parseLineRange(line: string): LineRange | null {
  const match = line.match(/\bLines?\s+(\d+)(?:\s*[-]\s*(\d+))?/i);
  if (!match) return null;
  const first = Number(match[1]);
  const second = Number(match[2] ?? match[1]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;
  return { lineStart: Math.min(first, second), lineEnd: Math.max(first, second) };
}

function formatLineRange(range: LineRange) {
  return range.lineStart === range.lineEnd ? `Line ${range.lineStart}` : `Lines ${range.lineStart}-${range.lineEnd}`;
}

function stripMarkdown(value: string) {
  return value.replace(/`{1,3}/g, "").replace(/\*\*/g, "").trim();
}

function summarizeText(value: string, fallback: string) {
  const cleaned = stripMarkdown(value);
  if (!cleaned) return fallback;
  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0];
  return firstSentence.length > 92 ? `${firstSentence.slice(0, 89).trim()}...` : firstSentence;
}

function reviewSeverityTone(severity: ReviewSeverity): {
  label: string;
  card: string;
  accent: string;
  iconWrap: string;
  lineBadge: string;
  badgeTone: "default" | "success" | "warning" | "danger" | "info";
} {
  switch (severity) {
    case "critical":
      return { label: "Critical", card: "border-rose-500/55 bg-rose-950/10", accent: "bg-rose-400/80", iconWrap: "border-rose-400/45 bg-rose-950/45 text-rose-100", lineBadge: "border-rose-400/35 bg-rose-950/45 text-rose-100", badgeTone: "danger" };
    case "important":
      return { label: "Must improve", card: "border-amber-400/55 bg-amber-950/10", accent: "bg-amber-300/80", iconWrap: "border-amber-300/45 bg-amber-950/45 text-amber-100", lineBadge: "border-amber-300/35 bg-amber-950/45 text-amber-100", badgeTone: "warning" };
    case "nice":
      return { label: "Nice-to-have", card: "border-sky-300/55 bg-sky-950/10", accent: "bg-sky-300/80", iconWrap: "border-sky-300/45 bg-sky-950/50 text-sky-100", lineBadge: "border-sky-300/35 bg-sky-950/45 text-sky-100", badgeTone: "info" };
    case "tests":
      return { label: "Tests", card: "border-emerald-300/50 bg-emerald-950/10", accent: "bg-emerald-300/75", iconWrap: "border-emerald-300/40 bg-emerald-950/40 text-emerald-100", lineBadge: "border-emerald-300/35 bg-emerald-950/40 text-emerald-100", badgeTone: "success" };
    default:
      return { label: "Tests", card: "border-emerald-300/50 bg-emerald-950/10", accent: "bg-emerald-300/75", iconWrap: "border-emerald-300/40 bg-emerald-950/40 text-emerald-100", lineBadge: "border-emerald-300/35 bg-emerald-950/40 text-emerald-100", badgeTone: "success" };
  }
}

function reviewSeverityIcon(severity: ReviewSeverity) {
  switch (severity) {
    case "critical":
      return <AlertTriangle className="h-4 w-4" />;
    case "important":
      return <Lightbulb className="h-4 w-4" />;
    case "nice":
      return <CheckCircle2 className="h-4 w-4" />;
    case "tests":
      return <TestTube2 className="h-4 w-4" />;
    default:
      return <TestTube2 className="h-4 w-4" />;
  }
}

export function CodingReviewWorkspace({ topicId, tasks, initialTaskId = null }: TopicCodingWorkspaceProps) {
  const availableTasks = useMemo(() => createCodingWorkspaceTasks(tasks), [tasks]);
  const [selectedTaskId, setSelectedTaskId] = useState(initialTaskId ?? availableTasks[0]?.id ?? "");
  const [language, setLanguage] = useState<SupportedLanguage>("python");
  const [code, setCode] = useState("");
  const [review, setReview] = useState<ReviewPayload | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [hoveredRange, setHoveredRange] = useState<LineRange | null>(null);

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
    setHoveredRange(null);
  }, [language, selectedTask, topicId]);

  useEffect(() => {
    if (!selectedTask) return;
    localStorage.setItem(storageKey(topicId, selectedTask.id, language), code);
  }, [code, language, selectedTask, topicId]);

  const reviewCount = review
    ? REVIEW_SECTION_CONFIG.length
    : 0;

  const submitReview = async () => {
    if (!selectedTask) return;
    setReviewing(true);
    setReviewError(null);
    setHoveredRange(null);
    try {
      const response: CodeReviewResponse = await api.reviewCode({
        task: `${selectedTask.title}\n\n${selectedTask.prompt}`,
        code,
        language: LANGUAGES.find((item) => item.value === language)?.label ?? language,
      });
      setReview({
        language,
        code,
        taskId: selectedTask.id,
        markdown: response.review_markdown,
        model: response.model,
        reviewedAt: response.reviewed_at,
      });
      setStale(false);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Unable to review code right now.");
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="space-y-3">
      <Card className="rounded-[24px] border-[#c29f60]/14 bg-[linear-gradient(180deg,#171920,#13151b)] p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-[#b89a68]">{selectedTask.kind}</p>
            <h3 className="mt-1.5 text-xl font-semibold text-[#f4ead6]">{selectedTask.title}</h3>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
            <Badge tone="info">{reviewCount} sections</Badge>
            {stale ? <Badge tone="warning">Review stale after edits</Badge> : null}
          </div>
        </div>
        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] xl:items-start">
          <div className="rounded-[16px] border border-[#c29f60]/10 bg-[#111318]/70 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-[#b89a68]">Problem statement</p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-[#dccfa6]/82">{selectedTask.statement}</p>
          </div>
          <TaskExamplesPanel taskId={selectedTask.id} examples={selectedTask.examples} />
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
              onClick={submitReview}
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
              ? "Select a supported language to submit this review."
              : reviewing
                ? "The reviewer is inspecting the submission."
                : "Feedback is grouped by issue category."}
          </span>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)] xl:items-start">
        <EditorSurface
          code={code}
          language={language}
          hoveredRange={hoveredRange}
          onChange={(value) => {
            setCode(value);
            if (review && value !== review.code) {
              setStale(true);
            }
          }}
        />

        <ReviewPanel
          review={review}
          stale={stale}
          error={reviewError}
          onHoverRange={setHoveredRange}
          onLeaveRange={() => setHoveredRange(null)}
        />
      </div>
    </div>
  );
}
