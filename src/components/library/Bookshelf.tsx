import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BookCard } from "@/components/library/BookCard";
import { Button } from "@/components/ui/button";
import type { Topic } from "@/types/models";

type BookshelfProps = {
  topics: Topic[];
  onDeleteTopic: (topic: Topic) => void;
  deletingTopicId?: string | null;
};

const TOPICS_PER_ROW = 4;
const MAX_ROWS_PER_PAGE = 3;
const TOPICS_PER_PAGE = TOPICS_PER_ROW * MAX_ROWS_PER_PAGE;

export function Bookshelf({ topics, onDeleteTopic, deletingTopicId }: BookshelfProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const topicSignature = topics.map((topic) => topic.id).join("|");
  const totalPages = Math.max(1, Math.ceil(topics.length / TOPICS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * TOPICS_PER_PAGE;
  const visibleTopics = topics.slice(pageStart, pageStart + TOPICS_PER_PAGE);
  const rows = useMemo(
    () =>
      Array.from({ length: MAX_ROWS_PER_PAGE }, (_, rowIndex) =>
        visibleTopics.slice(rowIndex * TOPICS_PER_ROW, (rowIndex + 1) * TOPICS_PER_ROW),
      ).filter((row) => row.length > 0),
    [visibleTopics],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [topicSignature]);

  if (!topics.length) {
    return (
      <div className="glass-panel flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#c29f60,#8a6d3b)] text-[#12141a] shadow-[0_12px_24px_rgba(194,159,96,0.2)]">
          <BookOpen className="h-7 w-7" />
        </div>
        <h2 className="mt-6 text-4xl font-semibold text-[var(--section-title-color)] font-serif">No saved topics found</h2>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="bookshelf-plank relative pl-8 pb-8 pt-4">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-serif italic text-[#c29f60]/80 tracking-wide">Shelf {rowIndex + 1}</p>
              <h3 className="text-2xl font-serif font-semibold text-[#f4ead6] mt-1">Saved learning topics</h3>
            </div>
            <p className="text-sm text-[#dccfa6]/60 font-serif italic">{row.length} Tome{row.length > 1 ? "s" : ""}</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4 items-end pl-2">
            {row.map((topic, index) => (
              <BookCard
                key={topic.id}
                topic={topic}
                index={pageStart + rowIndex * TOPICS_PER_ROW + index}
                onDelete={onDeleteTopic}
                deleting={deletingTopicId === topic.id}
              />
            ))}
          </div>
          <div className="bookshelf-rail z-20" />
        </div>
      ))}

      {totalPages > 1 ? (
        <div className="glass-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Button
            variant="secondary"
            disabled={safePage === 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <p className="text-sm text-[var(--library-copy-color)]">
            Page {safePage} of {totalPages}
          </p>
          <Button
            variant="secondary"
            disabled={safePage === totalPages}
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

