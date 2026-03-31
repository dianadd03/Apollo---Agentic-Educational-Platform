import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { TopicDetails } from "@/components/topics/TopicDetails";
import { Card } from "@/components/ui/card";
import { api } from "@/services/api";
import type { SearchResult, TopicDetail } from "@/types/models";

export function TopicPage() {
  const { topicId } = useParams();
  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [materials, setMaterials] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!topicId) return;
      setLoading(true);
      try {
        const detail = await api.getTopic(topicId);
        setTopic(detail);
        const searchResponse = await api.searchMaterials(detail.title);
        setMaterials(searchResponse.results);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load topic details.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [topicId]);

  if (!topicId) return <Navigate to="/library" replace />;

  return (
    <AppShell title={topic?.title ?? "Topic details"} subtitle="Saved topic overview and future study sections">
      {loading ? (
        <Card className="p-8 text-sm text-[#dccfa6]/70 border-[#c29f60]/10 bg-[#12141a]/60">Loading topic details...</Card>
      ) : error || !topic ? (
        <Card className="p-8 text-sm text-rose-400 border-rose-900 bg-rose-950/40">{error ?? "Topic not found."}</Card>
      ) : (
        <TopicDetails topic={topic} materials={materials} />
      )}
    </AppShell>
  );
}

