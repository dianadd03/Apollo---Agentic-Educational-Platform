import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { TopicDetails } from "@/components/topics/TopicDetails";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/services/api";
import type { AggregatedProblem, ProblemListMetadata, SearchResult, TopicDetail } from "@/types/models";

const MATERIAL_SEARCH_LIMIT = 28;

type TopicPageLocationState = {
  topic?: TopicDetail | null;
  materials?: SearchResult[];
  searchLoaded?: boolean;
};

export function TopicPage() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as TopicPageLocationState | null) ?? null;
  const [topic, setTopic] = useState<TopicDetail | null>(locationState?.topic ?? null);
  const [materials, setMaterials] = useState<SearchResult[]>(locationState?.materials ?? []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [problems, setProblems] = useState<AggregatedProblem[]>([]);
  const [problemsMeta, setProblemsMeta] = useState<ProblemListMetadata | null>(null);
  const [problemsLoading, setProblemsLoading] = useState(false);
  const [problemsError, setProblemsError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!topicId) return;
      setLoading(true);
      try {
        const detail = await api.getTopic(topicId);
        setTopic(detail);
        if (locationState?.searchLoaded && locationState.topic?.id === detail.id) {
          setMaterials(locationState.materials ?? []);
        } else {
          const savedSearches = await api.getSearchHistory(detail.title, 1);
          const latestSavedResults = savedSearches[0]?.results ?? [];

          if (latestSavedResults.length) {
            setMaterials(latestSavedResults);
          } else {
            const searchResponse = await api.searchMaterials(detail.title, MATERIAL_SEARCH_LIMIT);
            setMaterials(searchResponse.results);
          }
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load topic details.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [topicId, locationState]);

  useEffect(() => {
    if (!topic?.title) return;
    const loadProblems = async () => {
      setProblemsLoading(true);
      setProblemsError(null);
      try {
        const response = await api.getProblemsForTopic(topic.title, {
          difficulty: topic.level,
          maxResults: 30,
        });
        setProblems(response.problems);
        setProblemsMeta(response.metadata);
      } catch (err) {
        setProblemsError(err instanceof Error ? err.message : "Unable to load practice problems.");
      } finally {
        setProblemsLoading(false);
      }
    };
    void loadProblems();
  }, [topic?.id, topic?.title, topic?.level]);

  if (!topicId) return <Navigate to="/library" replace />;

  return (
    <div className="library-shell px-4 py-5 md:px-6 md:py-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <main className="flex-1">
      {loading ? (
        <Card className="border-[#c29f60]/10 [background:var(--topic-card-bg)] p-8 text-sm text-[var(--topic-copy-color)]">Loading topic details...</Card>
      ) : error || !topic ? (
        <Card className="p-8 text-sm text-rose-400 border-rose-900 bg-rose-950/40">{error ?? "Topic not found."}</Card>
      ) : (
        <div className="space-y-5">
          <Card className="overflow-hidden border-[#c29f60]/20 [background:var(--topic-panel-bg)] p-0">
            <div className="flex flex-col gap-4 border-b border-[#c29f60]/10 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="secondary"
                  className="rounded-[18px] border-[#c29f60]/25 bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] hover:bg-[var(--btn-secondary-hover-bg)] hover:text-[var(--btn-secondary-hover-text)]"
                  onClick={() => navigate("/library")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to library
                </Button>
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[#d7c08f]">Topic workbench</p>
                  <h1 className="text-3xl font-semibold text-[var(--topic-heading-color)] md:text-4xl">{topic.title}</h1>
                </div>
              </div>
              <div className="flex items-center gap-3 self-start md:self-auto">
                <span className="rounded-full border border-[#c29f60]/20 [background:var(--topic-card-bg)] px-4 py-2 text-sm text-[var(--topic-pill-text)]">
                  {materials.length} reviewed results
                </span>
              </div>
            </div>
          </Card>

          <TopicDetails
            topic={topic}
            materials={materials}
            problems={problems}
            problemsMeta={problemsMeta}
            problemsLoading={problemsLoading}
            problemsError={problemsError}
          />
        </div>
      )}
        </main>
      </div>
    </div>
  );
}
