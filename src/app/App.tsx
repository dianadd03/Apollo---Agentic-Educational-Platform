import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookCopy,
  BookOpenText,
  CircleDashed,
  Clock3,
  Code2,
  GraduationCap,
  Layers2,
  LineChart,
  LockKeyhole,
  Mail,
  SearchX,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Navigate, Route, Routes, useNavigate, useSearchParams, type NavigateFunction } from "react-router-dom";
import { AdminReviewTable } from "@/components/admin/AdminReviewTable";
import { AppShell } from "@/components/layout/AppShell";
import { MaterialTable } from "@/components/materials/MaterialTable";
import { AgentRunTimeline } from "@/components/observability/AgentRunTimeline";
import { ProblemTable } from "@/components/problems/ProblemTable";
import { CodeEditorPanel } from "@/components/review/CodeEditorPanel";
import { ReviewCategoryPanel } from "@/components/review/ReviewCategoryPanel";
import { TopicSearchBar } from "@/components/search/TopicSearchBar";
import { WorkflowProgress } from "@/components/search/WorkflowProgress";
import { TaskCard } from "@/components/tasks/TaskCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  collectAdminMaterials,
  findWorkspaceForTopic,
  initialRecentSearches,
  initialReviewTemplates,
  savedLearningPaths,
  stats,
  suggestedTopics,
  topicWorkspaces,
} from "@/data/mockData";
import type { CodeReview, FoundationalTask, ReviewFinding, TopicWorkspaceData, UserRole } from "@/types/models";

const onboardingInterests = ["Algorithms", "System Design", "Data Science", "Competitive Programming", "Teaching", "Databases"];

const reviewTemplates: Record<string, string> = {
  Graphs: `function bfs(graph: number[][], start: number) {\n  const queue = [start];\n  const visited = new Set<number>();\n  const parent = new Map<number, number>();\n\n  while (queue.length) {\n    const node = queue.pop();\n    if (node === undefined) continue;\n\n    visited.add(node);\n\n    for (const next of graph[node]) {\n      if (!visited.has(next)) {\n        parent.set(next, node);\n        queue.push(next);\n      }\n    }\n  }\n\n  return parent;\n}`,
  "Dynamic Programming": `def fib(n, memo={}):\n    if n <= 1:\n        return n\n    if n in memo:\n        return memo[n]\n    memo[n] = fib(n - 1) + fib(n - 2)\n    return memo[n]\n`,
  "Machine Learning": `def train_test_split(items, ratio=0.8):\n    cutoff = int(len(items) * ratio)\n    return items[:cutoff], items[cutoff:]\n`,
};

export default function App() {
  const [role, setRole] = useState<UserRole>("Student");
  const [experience, setExperience] = useState("Intermediate");
  const [interests, setInterests] = useState<string[]>(["Algorithms", "Competitive Programming"]);
  const [recentSearches, setRecentSearches] = useState(initialRecentSearches);
  const [workspace, setWorkspace] = useState<TopicWorkspaceData>(topicWorkspaces[0]);
  const [currentReview, setCurrentReview] = useState<CodeReview>(topicWorkspaces[0].review);
  const [searchLoading, setSearchLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  const handleSearch = (query: string, navigate: NavigateFunction) => {
    if (!query.trim()) return;
    setSearchLoading(true);
    navigate(`/workspace?topic=${encodeURIComponent(query.trim())}`);
    window.setTimeout(() => {
      const result = findWorkspaceForTopic(query);
      setWorkspace(result);
      setCurrentReview({
        ...result.review,
        code: result.review.code || reviewTemplates[result.topic] || "",
      });
      setRecentSearches((current) => [result.topic === "Unknown Topic" ? query.trim() : result.topic, ...current.filter((item) => item.toLowerCase() !== query.trim().toLowerCase())].slice(0, 5));
      setSearchLoading(false);
    }, 1200);
  };

  const handleCodeChange = (value: string) => {
    setCurrentReview((current) => ({
      ...current,
      code: value,
      stale: Boolean(current.createdAt) && current.code !== value,
    }));
  };

  const handleSubmitReview = () => {
    setReviewLoading(true);
    window.setTimeout(() => {
      setCurrentReview((current) => ({
        ...current,
        stale: false,
        createdAt: new Date().toISOString(),
      }));
      setReviewLoading(false);
    }, 1400);
  };

  const handleOpenTask = (task: FoundationalTask) => {
    setCurrentReview((current) => ({
      ...current,
      taskTitle: task.title,
      topic: workspace.topic,
      code: current.code || reviewTemplates[workspace.topic] || "",
      stale: false,
    }));
  };

  const handleLanguageChange = (language: CodeReview["language"]) => {
    setCurrentReview((current) => ({
      ...current,
      language,
    }));
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/auth" replace />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/onboarding"
        element={
          <OnboardingPage
            role={role}
            setRole={setRole}
            experience={experience}
            setExperience={setExperience}
            interests={interests}
            setInterests={setInterests}
          />
        }
      />
      <Route path="/dashboard" element={<DashboardPage role={role} recentSearches={recentSearches} onSearch={handleSearch} loading={searchLoading} />} />
      <Route
        path="/workspace"
        element={
          <WorkspacePage
            role={role}
            workspace={workspace}
            review={currentReview}
            onSearch={handleSearch}
            searchLoading={searchLoading}
            reviewLoading={reviewLoading}
            onCodeChange={handleCodeChange}
            onLanguageChange={handleLanguageChange}
            onSubmitReview={handleSubmitReview}
            onOpenTask={handleOpenTask}
          />
        }
      />
      <Route path="/admin" element={<AdminPage role={role} />} />
      <Route path="/observability" element={<ObservabilityPage role={role} />} />
    </Routes>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");

  return (
    <div className="min-h-screen bg-hero-grid bg-hero-grid p-6">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel flex flex-col justify-between p-8 lg:p-12">
          <div>
            <Badge tone="info">Apollo</Badge>
            <h1 className="mt-6 max-w-xl text-5xl font-semibold tracking-tight text-slate-950">
              Technical learning that feels curated, operational, and review-ready.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Search any topic, let the agentic pipeline build the learning path, then move straight into problems, implementation work, and AI review.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Curated learning paths", "Internal DB first, web fallback only when needed."],
              ["Problem aggregation", "Codeforces, LeetCode, AtCoder, plus generated bridge tasks."],
              ["AI code review", "Categorized findings with provenance and compiler-ready architecture."],
            ].map(([title, description]) => (
              <div key={title} className="rounded-2xl border bg-white/80 p-5">
                <p className="font-semibold text-slate-900">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel flex items-center p-6 lg:p-8">
          <div className="w-full">
            <div className="mb-6 flex rounded-2xl bg-slate-100 p-1">
              {[
                ["login", "Login"],
                ["signup", "Sign up"],
                ["forgot", "Forgot password"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition ${mode === value ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
                  onClick={() => setMode(value as typeof mode)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {mode === "signup" && <Input placeholder="Full name" />}
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                <Input className="pl-10" placeholder="Email address" />
              </div>
              {mode !== "forgot" && (
                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                  <Input className="pl-10" placeholder="Password" type="password" />
                </div>
              )}
              {mode === "signup" && <Input placeholder="Institution or organization" />}
            </div>

            <Button className="mt-6 w-full h-12" onClick={() => navigate("/onboarding")}>
              {mode === "forgot" ? "Send reset link" : mode === "signup" ? "Create Apollo workspace" : "Continue to Apollo"}
            </Button>

            <div className="mt-6 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Modern auth architecture</p>
              <p className="mt-1 text-sm text-slate-500">Clean entry for students, professors, and admins with room for SSO and institution-level auth later.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OnboardingPage({
  role,
  setRole,
  experience,
  setExperience,
  interests,
  setInterests,
}: {
  role: UserRole;
  setRole: (value: UserRole) => void;
  experience: string;
  setExperience: (value: string) => void;
  interests: string[];
  setInterests: (value: string[]) => void;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const toggleInterest = (interest: string) =>
    setInterests(interests.includes(interest) ? interests.filter((item) => item !== interest) : [...interests, interest]);

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit p-6">
          <p className="text-sm text-slate-500">Profile setup</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Welcome to Apollo</h1>
          <div className="mt-6 space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className={`rounded-2xl border p-4 ${step === item ? "border-sky-200 bg-sky-50" : ""}`}>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Step {item}</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {item === 1 ? "Choose role" : item === 2 ? "Set experience" : "Add interests"}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-8">
          {step === 1 && (
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Who are you using Apollo as?</h2>
              <p className="mt-3 text-slate-500">The platform adapts moderation, provenance, and review controls based on the user’s role.</p>
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {(["Student", "Professor"] as UserRole[]).map((option) => (
                  <button
                    key={option}
                    onClick={() => setRole(option)}
                    className={`rounded-3xl border p-6 text-left transition ${role === option ? "border-sky-300 bg-sky-50" : "hover:bg-slate-50"}`}
                  >
                    <GraduationCap className="h-6 w-6 text-sky-700" />
                    <p className="mt-4 text-xl font-semibold text-slate-950">{option}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      {option === "Student" ? "Search, learn, solve tasks, and submit code for review." : "Inspect provenance, confidence, tags, and moderation signals."}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">What is your current technical level?</h2>
              <p className="mt-3 text-slate-500">Apollo uses this to rank materials and tailor generated foundational tasks.</p>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {["Beginner", "Intermediate", "Advanced"].map((level) => (
                  <button
                    key={level}
                    onClick={() => setExperience(level)}
                    className={`rounded-3xl border p-6 text-left transition ${experience === level ? "border-sky-300 bg-sky-50" : "hover:bg-slate-50"}`}
                  >
                    <p className="text-lg font-semibold text-slate-950">{level}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      {level === "Beginner"
                        ? "Gentler sequencing and more explanatory resources."
                        : level === "Intermediate"
                          ? "Balanced conceptual material and implementation tasks."
                          : "Compact curation with deeper problems and review rigor."}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Add a few interests</h2>
              <p className="mt-3 text-slate-500">Optional, but useful for suggested topics and recommended learning paths.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                {onboardingInterests.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${interests.includes(interest) ? "border-sky-300 bg-sky-50 text-sky-700" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
              <div className="mt-8 rounded-2xl bg-slate-50 p-5">
                <p className="font-semibold text-slate-900">Current setup</p>
                <p className="mt-2 text-sm text-slate-500">
                  {role} • {experience} • {interests.length ? interests.join(", ") : "No interests selected"}
                </p>
              </div>
            </div>
          )}

          <div className="mt-10 flex justify-between">
            <Button variant="secondary" disabled={step === 1} onClick={() => setStep((current) => Math.max(1, current - 1))}>
              Back
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep((current) => current + 1)}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => navigate("/dashboard")}>
                Enter Apollo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function DashboardPage({
  role,
  recentSearches,
  onSearch,
  loading,
}: {
  role: string;
  recentSearches: string[];
  onSearch: (value: string, navigate: NavigateFunction) => void;
  loading: boolean;
}) {
  const navigate = useNavigate();

  return (
    <AppShell role={role}>
      <div className="space-y-6">
        <Card className="overflow-hidden bg-white/90 p-8">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <Badge tone="info">Search-driven learning workflow</Badge>
              <h2 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950">
                Search a technical topic and let Apollo turn it into a sequenced workspace.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                Apollo searches the internal corpus first, falls back to the web only when needed, validates quality with a secondary agent, and composes learning, practice, tasks, and review in one place.
              </p>
              <div className="mt-8">
                <TopicSearchBar onSubmit={(value) => onSearch(value, navigate)} loading={loading} hero />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {suggestedTopics.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => onSearch(topic, navigate)}
                    className="rounded-full border bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {stats.map((item) => (
                <Card key={item.label} className="p-5">
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{item.value}</p>
                  <p className="mt-2 text-sm text-sky-700">{item.delta}</p>
                </Card>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-6">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-sky-700" />
              <h3 className="section-title">Recent searches</h3>
            </div>
            <div className="mt-5 space-y-3">
              {recentSearches.map((search) => (
                <button
                  key={search}
                  onClick={() => onSearch(search, navigate)}
                  className="flex w-full items-center justify-between rounded-2xl border p-4 text-left transition hover:bg-slate-50"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{search}</p>
                    <p className="mt-1 text-sm text-slate-500">Re-open learning path, problems, tasks, and latest review context.</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2">
              <BookCopy className="h-4 w-4 text-sky-700" />
              <h3 className="section-title">Saved learning paths</h3>
            </div>
            <div className="mt-5 space-y-4">
              {savedLearningPaths.map((path) => (
                <div key={path.id} className="rounded-2xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">{path.title}</p>
                    <Badge tone="default">{path.items} items</Badge>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-slate-950" style={{ width: `${path.progress}%` }} />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{path.progress}% complete</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-sky-700" />
            <h3 className="section-title">Recent code reviews</h3>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {initialReviewTemplates.map((item) => (
              <div key={item.id} className="rounded-2xl border p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{item.task}</p>
                  <Badge tone={item.status.includes("Needs") ? "warning" : "success"}>{item.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-500">{item.topic}</p>
                <button onClick={() => onSearch(item.topic, navigate)} className="mt-4 text-sm font-semibold text-sky-700">
                  Open workspace
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function WorkspacePage({
  role,
  workspace,
  review,
  onSearch,
  searchLoading,
  reviewLoading,
  onCodeChange,
  onLanguageChange,
  onSubmitReview,
  onOpenTask,
}: {
  role: string;
  workspace: TopicWorkspaceData;
  review: CodeReview;
  onSearch: (value: string, navigate: NavigateFunction) => void;
  searchLoading: boolean;
  reviewLoading: boolean;
  onCodeChange: (value: string) => void;
  onLanguageChange: (language: CodeReview["language"]) => void;
  onSubmitReview: () => void;
  onOpenTask: (task: FoundationalTask) => void;
}) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [hoveredFinding, setHoveredFinding] = useState<ReviewFinding | null>(null);

  const activeTab = params.get("tab") ?? "materials";
  const tabs = [
    { id: "materials", label: "Learning Materials", icon: BookOpenText },
    { id: "problems", label: "Practice Problems", icon: Layers2 },
    { id: "tasks", label: "Foundational Tasks", icon: Sparkles },
    { id: "review", label: "AI Review", icon: Code2 },
  ];

  const modeLabel = useMemo(() => {
    if (workspace.searchMode === "internal") return { text: "Internal data strong", tone: "success" as const };
    if (workspace.searchMode === "web-fallback") return { text: "Web fallback used", tone: "info" as const };
    if (workspace.searchMode === "refinement") return { text: "Refinement recommended", tone: "warning" as const };
    return { text: "Insufficient results", tone: "danger" as const };
  }, [workspace.searchMode]);

  return (
    <AppShell role={role}>
      <div className="space-y-6">
        <Card className="overflow-hidden p-6">
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={modeLabel.tone}>{modeLabel.text}</Badge>
                <Badge tone="default">Topic preserved: {workspace.topic}</Badge>
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{workspace.topic} workspace</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{workspace.summary}</p>
              <div className="mt-6">
                <TopicSearchBar initialValue={workspace.topic} onSubmit={(value) => onSearch(value, navigate)} loading={searchLoading} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
              {[
                ["Materials", String(workspace.materials.length), workspace.materials.length ? "Curated and ranked" : "Awaiting retrieval"],
                ["Problems", String(workspace.problems.length), workspace.problems.some((item) => item.generated) ? "Includes AI-generated bridge items" : "Fetched from providers"],
                ["Review state", review.stale ? "Stale" : review.code ? "Ready" : "Empty", review.stale ? "Resubmit after edits" : "Line-linked feedback available"],
              ].map(([label, value, helper]) => (
                <Card key={label} className="p-5">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
                  <p className="mt-2 text-sm text-slate-500">{helper}</p>
                </Card>
              ))}
            </div>
          </div>
        </Card>

        <WorkflowProgress run={workspace.run} />

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  const next = new URLSearchParams(params);
                  next.set("tab", tab.id);
                  next.set("topic", workspace.topic);
                  setParams(next);
                }}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${active ? "bg-slate-950 text-white" : "border bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {workspace.searchMode === "empty" && (
          <Card className="p-8 text-center">
            <SearchX className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-4 text-xl font-semibold text-slate-950">Apollo needs a narrower topic to build a confident workspace</h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Try a more concrete topic like “graphs”, “dynamic programming”, or “databases indexing”. The workflow view above shows exactly where retrieval confidence fell off.
            </p>
          </Card>
        )}

        {activeTab === "materials" && workspace.materials.length > 0 && <MaterialTable materials={workspace.materials} />}
        {activeTab === "problems" && workspace.problems.length > 0 && <ProblemTable problems={workspace.problems} />}
        {activeTab === "tasks" && workspace.tasks.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {workspace.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onOpen={(selected) => {
                  onOpenTask(selected);
                  const next = new URLSearchParams(params);
                  next.set("tab", "review");
                  next.set("topic", workspace.topic);
                  setParams(next);
                }}
              />
            ))}
          </div>
        )}
        {activeTab === "review" && (
          <div className="space-y-5">
            <Card className="p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-sm text-slate-500">Review workspace</p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-950">{review.taskTitle || "Open a foundational task"}</h3>
                  <p className="mt-1 text-sm text-slate-500">Topic: {workspace.topic}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    className="rounded-xl border bg-white px-3 py-2 text-sm"
                    value={review.language}
                    onChange={(event) => onLanguageChange(event.target.value as CodeReview["language"])}
                  >
                    <option>TypeScript</option>
                    <option>Python</option>
                    <option>C++</option>
                  </select>
                  <Button onClick={onSubmitReview} disabled={reviewLoading || !review.code.trim()}>
                    {reviewLoading ? "Reviewing..." : "Submit for review"}
                  </Button>
                  <div className="rounded-2xl border border-dashed px-4 py-2 text-sm text-slate-500">Run later / compiler slot</div>
                </div>
              </div>
            </Card>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_420px]">
              <CodeEditorPanel
                code={review.code}
                onChange={onCodeChange}
                highlightedRange={hoveredFinding ? { start: hoveredFinding.lineStart, end: hoveredFinding.lineEnd } : null}
                stale={review.stale}
              />
              <ReviewCategoryPanel review={review} loading={reviewLoading} onHoverFinding={setHoveredFinding} />
            </div>
          </div>
        )}

        {((activeTab === "materials" && !workspace.materials.length) ||
          (activeTab === "problems" && !workspace.problems.length) ||
          (activeTab === "tasks" && !workspace.tasks.length)) && (
          <Card className="p-8 text-center">
            <CircleDashed className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-4 text-xl font-semibold text-slate-950">Nothing to show in this section yet</h3>
            <p className="mt-2 text-sm text-slate-500">Apollo is holding back this content until the retrieval and validation stages become more confident.</p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function AdminPage({ role }: { role: string }) {
  const items = useMemo(() => collectAdminMaterials(), []);

  return (
    <AppShell role={role}>
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-sky-700" />
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Professor and moderation controls</h2>
              <p className="mt-1 text-sm text-slate-500">Inspect provenance, validate low-confidence resources, and correct metadata before exposure to learners.</p>
            </div>
          </div>
        </Card>
        <AdminReviewTable items={items} />
      </div>
    </AppShell>
  );
}

function ObservabilityPage({ role }: { role: string }) {
  return (
    <AppShell role={role}>
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <LineChart className="h-5 w-5 text-sky-700" />
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Agent workflow observability</h2>
              <p className="mt-1 text-sm text-slate-500">Operational view of retrieval, fallback, validation, ranking, task generation, problem aggregation, and review analysis.</p>
            </div>
          </div>
        </Card>
        <AgentRunTimeline runs={topicWorkspaces.map((workspace) => workspace.run)} />
      </div>
    </AppShell>
  );
}
