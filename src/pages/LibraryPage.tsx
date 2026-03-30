import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Bookshelf } from "@/components/library/Bookshelf";
import { SearchBar } from "@/components/library/SearchBar";
import { TopicLevelModal } from "@/components/library/TopicLevelModal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import type { Topic, TopicLevel } from "@/types/models";

export function LibraryPage() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingTopic, setPendingTopic] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<TopicLevel>("beginner");

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

  const handleSearch = (topic: string) => {
    setPendingTopic(topic);
    setSelectedLevel("beginner");
  };

  const handleCreateTopic = async () => {
    if (!pendingTopic) return;
    setSaving(true);
    try {
      const saved = await api.createTopic(pendingTopic, selectedLevel);
      setTopics((current) => [saved, ...current]);
      setPendingTopic("");
      setError(null);
      navigate(`/topics/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save topic.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Learning Library" subtitle="Search-driven learning platform with a bookshelf front">
      <div className="space-y-6">
        <Card className="p-6 lg:p-8">
          <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr] xl:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[#a3835b]">Your study collection</p>
              <h2 className="mt-3 text-5xl font-semibold tracking-tight text-[#f4ead6] font-serif">Search a technical topic, then save it as a book in your learning library.</h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[#dccfa6]/80">
                Apollo is still a learning platform first. The library metaphor simply helps organize saved topics visually, while level remains selected per topic after search.
              </p>
              <div className="mt-8">
                <SearchBar onSearch={handleSearch} loading={saving} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Card className="p-5 border-[#c29f60]/20 bg-[#12141a]/60">
                <p className="text-sm text-[#a3835b]">Saved topics</p>
                <p className="mt-2 text-4xl font-semibold text-[#f4ead6] font-serif">{topics.length}</p>
                <p className="mt-2 text-sm text-[#dccfa6]/70">Every saved topic appears as a book on your shelf.</p>
              </Card>
              <Card className="p-5 border-[#c29f60]/20 bg-[linear-gradient(135deg,#1c1e26,#15171e)]">
                <p className="text-sm text-[#a3835b]">Per-topic difficulty</p>
                <p className="mt-2 text-2xl font-semibold text-[#f4ead6] font-serif">Beginner, intermediate, or advanced</p>
                <p className="mt-2 text-sm text-[#dccfa6]/70">Chosen after search, not during authentication.</p>
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

        {loading ? <Card className="p-8 text-sm text-[#dccfa6]/70 border-[#c29f60]/10">Loading your shelf...</Card> : <Bookshelf topics={topics} />}
      </div>

      <TopicLevelModal
        open={Boolean(pendingTopic)}
        topic={pendingTopic}
        selectedLevel={selectedLevel}
        onSelect={setSelectedLevel}
        onClose={() => setPendingTopic("")}
        onConfirm={() => void handleCreateTopic()}
        loading={saving}
      />
    </AppShell>
  );
}

