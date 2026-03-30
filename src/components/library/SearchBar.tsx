import { Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SearchBarProps = {
  onSearch: (topic: string) => void;
  loading?: boolean;
};

export function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [value, setValue] = useState("");

  return (
    <div className="glass-panel p-3">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="flex flex-1 items-center gap-3 rounded-[22px] border border-[#c29f60]/30 bg-[#12141a]/80 px-4 py-3 shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)]">
          <Search className="h-5 w-5 text-[#a3835b]" />
          <Input
            className="border-none bg-transparent px-0 py-0 text-base text-[#f4ead6] placeholder:text-[#dccfa6]/50 focus:ring-0"
            placeholder="Search a technical topic to add to your learning shelf"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && value.trim()) {
                onSearch(value.trim());
              }
            }}
          />
        </div>
        <Button 
          disabled={loading || !value.trim()} 
          onClick={() => onSearch(value.trim())}
          className="bg-[linear-gradient(135deg,#c29f60,#8a6d3b)] text-[#12141a] hover:opacity-90 transition-opacity border-none rounded-[20px]"
        >
          Add topic
        </Button>
      </div>
    </div>
  );
}

