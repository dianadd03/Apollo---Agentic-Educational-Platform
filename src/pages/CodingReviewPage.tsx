import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CodingReviewWorkspace } from "@/components/topics/CodingReviewWorkspace";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/services/api";
import type { TopicDetail } from "@/types/models";

type CodingReviewLocationState = {
  topic?: TopicDetail | null;
};

export function CodingReviewPage() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialTaskId = searchParams.get("task");
  const locationState = (location.state as CodingReviewLocationState | null) ?? null;
  const [topic, setTopic] = useState<TopicDetail | null>(locationState?.topic ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!topicId) return;
      setLoading(true);
      try {
        if (locationState?.topic?.id === topicId) {
          setTopic(locationState.topic);
        } else {
          const detail = await api.getTopic(topicId);
          setTopic(detail);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load coding review workspace.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [locationState, topicId]);

  if (!topicId) return <Navigate to="/library" replace />;

  return (
    <div className="library-shell px-4 py-5 md:px-6 md:py-6">
      <div className="mx-auto flex max-w-[1760px] flex-col gap-5">
        <main className="flex-1">
          {loading ? (
            <Card className="border-[#c29f60]/10 bg-[#12141a]/60 p-8 text-sm text-[#dccfa6]/70">Loading coding review workspace...</Card>
          ) : error || !topic ? (
            <Card className="border-rose-900 bg-rose-950/40 p-8 text-sm text-rose-400">{error ?? "Topic not found."}</Card>
          ) : (
            <div className="space-y-5">
              <Card className="overflow-hidden border-[#c29f60]/20 bg-[linear-gradient(180deg,#1c1e26,#15171e)] p-0">
                <div className="flex flex-col gap-4 border-b border-[#c29f60]/10 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
                  <div className="flex flex-wrap items-center gap-4">
                    <Button
                      variant="secondary"
                      className="rounded-[18px] border-[#c29f60]/25 bg-[#161820] text-[#f4ead6] hover:bg-[#1c1e26]"
                      onClick={() => navigate(`/topics/${topic.id}`, { state: { topic } })}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to topic
                    </Button>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-[#d7c08f]">Code review workspace</p>
                      <h1 className="text-3xl font-semibold text-[#f7f0df] md:text-4xl">{topic.title}</h1>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-start md:self-auto">
                    <span className="rounded-full border border-[#c29f60]/20 bg-[#12141a]/60 px-4 py-2 text-sm font-medium capitalize text-[#f3ead2]">
                      {topic.level}
                    </span>
                    <span className="rounded-full border border-[#c29f60]/20 bg-[#12141a]/60 px-4 py-2 text-sm text-[#ecdfbf]">
                      Full-page editor
                    </span>
                  </div>
                </div>
              </Card>

              <CodingReviewWorkspace
                topicId={topic.id}
                tasks={topic.coding_tasks}
                initialTaskId={initialTaskId}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
