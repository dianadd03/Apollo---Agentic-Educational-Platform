import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { TopicLevel } from "@/types/models";

const levels: Array<{ value: TopicLevel; label: string; helper: string }> = [
  { value: "beginner", label: "Beginner", helper: "Foundational explanations and gentler ramp-up." },
  { value: "intermediate", label: "Intermediate", helper: "Balanced materials, exercises, and coding depth." },
  { value: "advanced", label: "Advanced", helper: "Denser content, deeper tasks, and stronger challenge." },
];

type TopicLevelModalProps = {
  open: boolean;
  topic: string;
  selectedLevel: TopicLevel;
  onSelect: (level: TopicLevel) => void;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
};

export function TopicLevelModal({ open, topic, selectedLevel, onSelect, onClose, onConfirm, loading }: TopicLevelModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0f13]/80 px-4 backdrop-blur-sm">
      <Card className="w-full max-w-2xl p-7 border-[#c29f60]/30 shadow-[0_20px_60px_rgba(0,0,0,0.8)] bg-[#161820]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[#a3835b]">Topic setup</p>
            <h2 className="mt-2 text-4xl font-semibold text-[#f4ead6] font-serif">Choose the level for {topic}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#dccfa6]/80">This keeps the learning platform behavior intact: the user profile stays simple, while each topic carries its own level and study context.</p>
          </div>
          <button className="rounded-2xl border border-[#c29f60]/20 bg-[#1c1e26] p-2 text-[#dccfa6]/70 hover:text-[#f4ead6] hover:bg-[#2c221d] transition-colors" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {levels.map((level) => (
            <button
              key={level.value}
              onClick={() => onSelect(level.value)}
              className={`rounded-[24px] border p-5 text-left transition ${
                selectedLevel === level.value
                  ? "border-[#c29f60] bg-[linear-gradient(135deg,#2c221d,#161820)] shadow-[0_14px_24px_rgba(194,159,96,0.15)]"
                  : "border-[#c29f60]/20 bg-[#1a1c23] hover:bg-[#20232b]"
              }`}
            >
              <p className={`text-sm font-semibold uppercase tracking-[0.18em] ${selectedLevel === level.value ? "text-[#c29f60]" : "text-[#f4ead6]"}`}>{level.label}</p>
              <p className="mt-3 text-sm leading-7 text-[#dccfa6]/70">{level.helper}</p>
            </button>
          ))}
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <Button variant="ghost" className="text-[#dccfa6] hover:text-[#f4ead6] hover:bg-[#1a1c23]" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm} disabled={loading} className="bg-[linear-gradient(135deg,#c29f60,#8a6d3b)] text-[#12141a] hover:opacity-90 transition-opacity border-none">Save to library</Button>
        </div>
      </Card>
    </div>
  );
}

