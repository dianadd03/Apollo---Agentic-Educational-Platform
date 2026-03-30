import { BookOpen } from "lucide-react";
import { BookCard } from "@/components/library/BookCard";
import type { Topic } from "@/types/models";

type BookshelfProps = {
  topics: Topic[];
};

export function Bookshelf({ topics }: BookshelfProps) {
  if (!topics.length) {
    return (
      <div className="glass-panel flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#c29f60,#8a6d3b)] text-[#12141a] shadow-[0_12px_24px_rgba(194,159,96,0.2)]">
          <BookOpen className="h-7 w-7" />
        </div>
        <h2 className="mt-6 text-4xl font-semibold text-[#f4ead6] font-serif">Start your first topic shelf</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#dccfa6]/80">
          Search a technical topic, choose the appropriate level for that topic, and Apollo will save it as a study book inside your personal learning library.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {[topics.slice(0, 4), topics.slice(4, 8), topics.slice(8)].filter((row) => row.length > 0).map((row, rowIndex) => (
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
              <BookCard key={topic.id} topic={topic} index={rowIndex * 4 + index} />
            ))}
          </div>
          <div className="bookshelf-rail z-20" />
        </div>
      ))}
    </div>
  );
}


