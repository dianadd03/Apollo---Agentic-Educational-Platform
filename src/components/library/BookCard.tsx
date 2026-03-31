import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import type { Topic } from "@/types/models";

const coverThemes = [
  "from-[#4e1c24] to-[#2a0e12]", // Crimson
  "from-[#1c2e4a] to-[#0e1625]", // Navy
  "from-[#243b29] to-[#121e14]", // Emerald
  "from-[#3b2b4a] to-[#1e1525]", // Amethyst
  "from-[#4a3922] to-[#251c11]", // Walnut
];

const spineThemes = [
  "bg-[#2a0e12]",
  "bg-[#0e1625]",
  "bg-[#121e14]",
  "bg-[#1e1525]",
  "bg-[#251c11]",
];

type BookCardProps = {
  topic: Topic;
  index: number;
};

export function BookCard({ topic, index }: BookCardProps) {
  const themeIndex = index % coverThemes.length;
  const theme = coverThemes[themeIndex];
  const spine = spineThemes[themeIndex];
  const emblem = buildEmblem(topic.title);

  return (
    <Link
      to={`/topics/${topic.id}`}
      className="group relative flex h-[280px] min-h-[280px] flex-col justify-between overflow-hidden rounded-r-[18px] rounded-l-[4px] border-y border-r border-[#c29f60]/20 bg-[#f4ead6] shadow-[12px_20px_40px_rgba(0,0,0,0.6),inset_-4px_0_12px_rgba(0,0,0,0.1)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[16px_24px_48px_rgba(0,0,0,0.7)]"
    >
      {/* Pages edge on the right */}
      <div className="absolute inset-y-0 right-0 w-2 bg-[linear-gradient(90deg,#dccfa6,#f4ead6)] border-l border-[#c29f60]/20 z-0 opacity-80" />
      
      {/* Main Cover */}
      <div className={`relative z-10 flex min-h-0 flex-1 flex-col rounded-r-[14px] rounded-l-[2px] border-l-8 border-l-black/40 bg-gradient-to-br ${theme} p-5 text-[#f4ead6] mr-1`}>
        {/* Book Texture Overlay */}
        <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/leather.png')]" />
        
        <div className="relative z-10 flex items-start justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#c29f60]">Vol. {index + 1}</p>
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c29f60]/40 bg-black/30 text-xs font-serif text-[#f4ead6] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
            {emblem}
          </div>
        </div>
        <div className="relative z-10 mt-6 flex-1 flex flex-col justify-center">
          <p className="line-clamp-4 text-[1.8rem] font-serif font-bold leading-[1.15] text-center" style={{ textShadow: '1px 2px 4px rgba(0,0,0,0.8)' }}>
            {topic.title}
          </p>
        </div>
        <div className="relative z-10 mt-auto flex flex-col items-center pt-4">
          <div className="h-[2px] w-12 bg-[#c29f60]/40 mb-3 rounded-full" />
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#c29f60]/80">Apollo Shelf</p>
        </div>
      </div>
      
      {/* Bottom Bookmark Ribbon & Metadata */}
      <div className="absolute top-0 right-6 w-3 h-16 bg-[#a31a1a] shadow-[2px_4px_8px_rgba(0,0,0,0.5)] z-0 rounded-b-sm translate-y-[-10px] group-hover:translate-y-0 transition-transform duration-300" />
      
      <div className="relative z-20 flex flex-col justify-end pt-3 bg-gradient-to-t from-black/80 to-transparent p-4 h-24 mb-1 mr-1">
        <div className="flex justify-between items-end">
          <Badge tone="warning" className="capitalize bg-[#2c221d] text-[#c29f60] border border-[#c29f60]/30 shadow-md">{topic.level}</Badge>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#dccfa6]/60 text-right">Added<br/>{new Date(topic.created_at).toLocaleDateString()}</p>
        </div>
      </div>
    </Link>
  );
}

function buildEmblem(title: string) {
  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "AP";
}

