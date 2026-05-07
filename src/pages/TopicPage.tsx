import { useEffect, useState } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProblemsSection } from "@/components/problems/ProblemsSection";
import { TopicDetails } from "@/components/topics/TopicDetails";
import { Card } from "@/components/ui/card";
import { api } from "@/services/api";
import type { AggregatedProblem, ProblemListMetadata, SearchResult, TopicDetail } from "@/types/models";

const MATERIAL_SEARCH_LIMIT = 20;

type TopicPageLocationState = {
  topic?: TopicDetail | null;
  materials?: SearchResult[];
  searchLoaded?: boolean;
};

export function TopicPage() {
  const { topicId } = useParams();
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
          const searchResponse = await api.searchMaterials(detail.title, MATERIAL_SEARCH_LIMIT);
          setMaterials(searchResponse.results);
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
    <AppShell title={topic?.title ?? "Topic details"} subtitle="Saved topic overview and future study sections">
      {loading ? (
        <Card className="p-8 text-sm text-[#dccfa6]/70 border-[#c29f60]/10 bg-[#12141a]/60">Loading topic details...</Card>
      ) : error || !topic ? (
        <Card className="p-8 text-sm text-rose-400 border-rose-900 bg-rose-950/40">{error ?? "Topic not found."}</Card>
      ) : (
        <div className="space-y-6">
          <TopicDetails topic={topic} materials={materials} />
          <ProblemsSection
            problems={problems}
            metadata={problemsMeta}
            loading={problemsLoading}
            error={problemsError}
          />
        </div>
      )}
    </AppShell>
  );
}
