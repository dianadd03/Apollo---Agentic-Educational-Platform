import { useState } from "react";
import { ArrowRight, CircleDashed, GraduationCap, LockKeyhole, Mail, SearchX } from "lucide-react";
import { Navigate, Route, Routes, useNavigate, type NavigateFunction } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { MaterialTable } from "@/components/materials/MaterialTable";
import { TopicSearchBar } from "@/components/search/TopicSearchBar";
import { WorkflowProgress } from "@/components/search/WorkflowProgress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { emptyWorkspace } from "@/data/mockData";
import { buildWorkspaceFromSearch, searchMaterials } from "@/lib/materialSearch";
import type { CodeReview, TopicWorkspaceData, UserRole } from "@/types/models";

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
  const [workspace, setWorkspace] = useState<TopicWorkspaceData>(emptyWorkspace);
  const [currentReview, setCurrentReview] = useState<CodeReview>(emptyWorkspace.review);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async (query: string, navigate: NavigateFunction) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    setSearchLoading(true);
    setSearchError(null);
    navigate(`/workspace?topic=${encodeURIComponent(trimmedQuery)}`);

    try {
      const response = await searchMaterials({ topic: trimmedQuery });
      const nextWorkspace = buildWorkspaceFromSearch(trimmedQuery, response);
      setWorkspace(nextWorkspace);
      setCurrentReview({
        ...nextWorkspace.review,
        code: nextWorkspace.review.code || reviewTemplates[nextWorkspace.topic] || "",
      });
    } catch (error) {
      const fallbackWorkspace = {
        ...emptyWorkspace,
        topic: trimmedQuery,
        review: {
          ...emptyWorkspace.review,
          topic: trimmedQuery,
        },
        summary: "Apollo could not retrieve web results for this topic yet. Please try again with a narrower phrase.",
      };
      setWorkspace(fallbackWorkspace);
      setCurrentReview(fallbackWorkspace.review);
      setSearchError("The frontend could not reach the backend search API at http://127.0.0.1:8000. Start the Python backend and try again.");
      console.error("Failed to fetch search materials", error);
    } finally {
      setSearchLoading(false);
    }
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
      <Route path="/dashboard" element={<DashboardPage role={role} onSearch={handleSearch} loading={searchLoading} searchError={searchError} />} />
      <Route
        path="/workspace"
        element={
          <WorkspacePage
            role={role}
            workspace={workspace}
            onSearch={handleSearch}
            searchLoading={searchLoading}
            searchError={searchError}
          />
        }
      />
      <Route path="/admin" element={<SimplePlaceholderPage role={role} title="Professor and moderation controls" description="This area is reserved for later review and moderation integration." />} />
      <Route path="/observability" element={<SimplePlaceholderPage role={role} title="Agent workflow observability" description="This area is reserved for later observability integration." />} />
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
              Search any topic and retrieve live candidate materials from the web with a backend search agent.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Live retrieval", "Search requests are sent to the backend and returned as generated candidate links."],
              ["No seeded examples", "The search area no longer shows hard-coded topic suggestions or canned result sets."],
              ["Review-ready shape", "Returned links are structured for a later validation and review agent."],
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

            <Button className="mt-6 h-12 w-full" onClick={() => navigate("/onboarding")}>
              {mode === "forgot" ? "Send reset link" : mode === "signup" ? "Create Apollo workspace" : "Continue to Apollo"}
            </Button>
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
                <p className="mt-1 font-semibold text-slate-900">{item === 1 ? "Choose role" : item === 2 ? "Set experience" : "Add interests"}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-8">
          {step === 1 && (
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Who are you using Apollo as?</h2>
              <p className="mt-3 text-slate-500">The platform adapts moderation and review controls based on the user role.</p>
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
                      {option === "Student" ? "Search and review technical topics." : "Inspect provenance and later-stage validation flows."}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">What is your current technical level?</h2>
              <p className="mt-3 text-slate-500">Apollo can later use this for ranking and sequencing.</p>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {["Beginner", "Intermediate", "Advanced"].map((level) => (
                  <button
                    key={level}
                    onClick={() => setExperience(level)}
                    className={`rounded-3xl border p-6 text-left transition ${experience === level ? "border-sky-300 bg-sky-50" : "hover:bg-slate-50"}`}
                  >
                    <p className="text-lg font-semibold text-slate-950">{level}</p>
                    <p className="mt-2 text-sm text-slate-500">Used later for personalization and material ordering.</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Add a few interests</h2>
              <p className="mt-3 text-slate-500">Optional, but useful for future personalization.</p>
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
  onSearch,
  loading,
  searchError,
}: {
  role: string;
  onSearch: (value: string, navigate: NavigateFunction) => void | Promise<void>;
  loading: boolean;
  searchError: string | null;
}) {
  const navigate = useNavigate();

  return (
    <AppShell role={role}>
      <div className="space-y-6">
        <Card className="overflow-hidden bg-white/90 p-8">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <Badge tone="info">Search-driven retrieval</Badge>
              <h2 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950">
                Search a technical topic and see only generated web results.
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                The search area now shows live web retrieval only. No hard-coded example topics or seeded material cards are displayed.
              </p>
              <div className="mt-8">
                <TopicSearchBar onSubmit={(value) => onSearch(value, navigate)} loading={loading} hero />
              </div>
              {searchError ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{searchError}</div>
              ) : null}
            </div>
            <Card className="p-6">
              <p className="text-sm text-slate-500">Current mode</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Generated links only</p>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                After a search completes, the workspace will list only each result title and its direct link.
              </p>
            </Card>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function WorkspacePage({
  role,
  workspace,
  onSearch,
  searchLoading,
  searchError,
}: {
  role: string;
  workspace: TopicWorkspaceData;
  onSearch: (value: string, navigate: NavigateFunction) => void | Promise<void>;
  searchLoading: boolean;
  searchError: string | null;
}) {
  const navigate = useNavigate();

  const modeLabel =
    workspace.searchMode === "web-fallback"
      ? { text: "Web results ready", tone: "info" as const }
      : workspace.searchMode === "empty"
        ? { text: "Awaiting results", tone: "danger" as const }
        : { text: "Search processed", tone: "success" as const };

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
                <TopicSearchBar initialValue={workspace.topic === "Unknown Topic" ? "" : workspace.topic} onSubmit={(value) => onSearch(value, navigate)} loading={searchLoading} />
              </div>
              {searchError ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{searchError}</div>
              ) : null}
            </div>
            <div className="grid gap-4">
              <Card className="p-5">
                <p className="text-sm text-slate-500">Web results</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{workspace.materials.length}</p>
                <p className="mt-2 text-sm text-slate-500">Only generated title and link pairs are shown below.</p>
              </Card>
            </div>
          </div>
        </Card>

        <WorkflowProgress run={workspace.run} />

        {workspace.searchMode === "empty" && (
          <Card className="p-8 text-center">
            <SearchX className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-4 text-xl font-semibold text-slate-950">Apollo needs a topic to retrieve live web results</h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Search for a concrete technical topic to populate this workspace with generated links from the backend search agent.
            </p>
          </Card>
        )}

        {workspace.materials.length > 0 ? (
          <MaterialTable materials={workspace.materials} />
        ) : (
          <Card className="p-8 text-center">
            <CircleDashed className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-4 text-xl font-semibold text-slate-950">No generated web results to show yet</h3>
            <p className="mt-2 text-sm text-slate-500">When the search agent returns links, they will appear here with only the title and direct URL action.</p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function SimplePlaceholderPage({ role, title, description }: { role: string; title: string; description: string }) {
  return (
    <AppShell role={role}>
      <Card className="p-6">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </Card>
    </AppShell>
  );
}
