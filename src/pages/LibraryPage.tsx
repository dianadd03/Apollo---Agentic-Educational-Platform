import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Bookshelf } from "@/components/library/Bookshelf";
import { SearchBar } from "@/components/library/SearchBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import type { SearchResult, Topic } from "@/types/models";
import { useSearch } from "@/context/SearchContext";

const MATERIAL_SEARCH_LIMIT = 28;
const DEFAULT_TOPIC_LEVEL = "beginner" as const;

export function LibraryPage() {
  const navigate = useNavigate();
  const { searchQuery, setSearchQuery } = useSearch();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null);

  const loadTopics = async () => {
    setLoading(true);
    try {
      const topicList = await api.getTopics();
      setTopics(topicList);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load your topics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTopics();
  }, []);

  const handleSearch = async (topicTitle: string) => {
    setSearchQuery("");
    setSaving(true);
    try {
      const searchResponse = await api.searchMaterials(topicTitle, MATERIAL_SEARCH_LIMIT);
      const preloadedMaterials: SearchResult[] = searchResponse.results;
      const saved = await api.createTopic(topicTitle, DEFAULT_TOPIC_LEVEL);

      setTopics((current) => [saved, ...current]);
      setError(null);
      navigate(`/topics/${saved.id}`, {
        state: {
          topic: saved,
          materials: preloadedMaterials,
          searchLoaded: true,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to search and save topic.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTopic = async (topic: Topic) => {
    const confirmed = window.confirm(`Remove "${topic.title}" from your library?`);
    if (!confirmed) return;

    setDeletingTopicId(topic.id);
    try {
      await api.deleteTopic(topic.id);
      setTopics((current) => current.filter((item) => item.id !== topic.id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove topic.");
    } finally {
      setDeletingTopicId(null);
    }
  };

  const filteredTopics = topics.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppShell title="Learning Library" subtitle="Search-driven learning platform with a bookshelf front">
      <div className="space-y-6">
        <Card className="p-6 lg:p-8">
          <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr] xl:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[#a3835b]">Your study collection</p>
              <h2 className="mt-3 text-5xl font-semibold tracking-tight text-[var(--foreground)] font-serif">Search a technical topic, then save it as a book in your learning library.</h2>
              <div className="mt-8">
                <SearchBar onSearch={handleSearch} loading={saving} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Card className="p-5 border-[var(--btn-secondary-border)] bg-[var(--input-bg)]">
                <p className="text-sm text-[#a3835b]">Saved topics</p>
                <p className="mt-2 text-4xl font-semibold text-[var(--foreground)] font-serif">{topics.length}</p>
                <p className="mt-2 text-sm text-[var(--library-copy-color)]">Every saved topic appears as a book on your shelf.</p>
              </Card>
              <Card className="p-5 border-[var(--btn-secondary-border)] bg-[var(--subtle-bg)]">
                <p className="text-sm text-[#a3835b]">Search flow</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--foreground)] font-serif">Search, save, and open the topic directly</p>
                <p className="mt-2 text-sm text-[var(--library-copy-color)]">The topic is added to your shelf and opened immediately after materials are loaded.</p>
              </Card>
            </div>
          </div>
        </Card>

        {error ? (
          <Card className="flex items-center justify-between gap-4 p-4 text-sm text-rose-400 bg-rose-950/40 border-rose-900">
            <span>{error}</span>
            <Button variant="ghost" className="text-rose-200 hover:text-white" onClick={() => void loadTopics()}>Retry</Button>
          </Card>
        ) : null}

        {loading ? (
          <Card className="p-8 text-sm text-[var(--library-copy-color)] border-[var(--btn-secondary-border)]">Loading your shelf...</Card>
        ) : (
          <Bookshelf topics={filteredTopics} onDeleteTopic={(topic) => void handleDeleteTopic(topic)} deletingTopicId={deletingTopicId} />
        )}
      </div>
    </AppShell>
  );
}
