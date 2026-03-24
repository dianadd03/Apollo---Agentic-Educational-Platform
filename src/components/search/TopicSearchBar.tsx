import { Loader2, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TopicSearchBarProps = {
  initialValue?: string;
  onSubmit: (value: string) => void;
  loading?: boolean;
  hero?: boolean;
};

export function TopicSearchBar({ initialValue = "", onSubmit, loading, hero }: TopicSearchBarProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <div
      className={cn(
        "rounded-[28px] border bg-white p-3 shadow-soft transition focus-within:border-sky-300 focus-within:ring-4 focus-within:ring-sky-100",
        hero && "bg-white/95 backdrop-blur",
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-3 rounded-2xl bg-slate-50 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Discover a technical topic</p>
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onSubmit(value);
                }
              }}
              className="w-full bg-transparent text-base font-medium text-slate-900 placeholder:text-slate-400"
              placeholder="Search dynamic programming, graphs, recursion, machine learning..."
            />
          </div>
        </div>
        <Button className="h-[72px] min-w-[180px] rounded-2xl" onClick={() => onSubmit(value)} disabled={loading || !value.trim()}>
          <Sparkles className="mr-2 h-4 w-4" />
          Generate workspace
        </Button>
      </div>
    </div>
  );
}
