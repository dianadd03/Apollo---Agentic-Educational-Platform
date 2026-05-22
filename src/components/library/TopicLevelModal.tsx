import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { TopicLevel } from "@/types/models";

const levels: Array<{ value: TopicLevel; label: string; helper: string }> = [
  { value: "beginner", label: "Beginner", helper: "Foundational explanations and gentler ramp-up." },
  { value: "intermediate", label: "Intermediate", helper: "Balanced materials, exercises, and coding depth." },
  { value: "advanced", label: "Advanced", helper: "Denser content, deeper tasks, and stronger challenge." },
  { value: "expert", label: "Expert", helper: "Research-heavy resources and specialist depth." },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--modal-overlay-bg)] px-4 backdrop-blur-sm">
      <Card className="w-full max-w-2xl p-7 border-[var(--modal-border)] shadow-[var(--modal-shadow)] bg-[var(--modal-bg)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[#a3835b]">Topic setup</p>
            <h2 className="mt-2 text-4xl font-semibold text-[var(--foreground)] font-serif">Choose the level for {topic}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--library-copy-color)]">This keeps the learning platform behavior intact: the user profile stays simple, while each topic carries its own level and study context.</p>
          </div>
          <button className="rounded-2xl border border-[var(--btn-secondary-border)] bg-[var(--btn-secondary-bg)] p-2 text-[var(--btn-ghost-text)] hover:text-[var(--btn-secondary-hover-text)] hover:bg-[var(--btn-secondary-hover-bg)] transition-colors" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-4">
          {levels.map((level) => (
            <button
              key={level.value}
              onClick={() => onSelect(level.value)}
              className={`rounded-[24px] border p-5 text-left transition ${
                selectedLevel === level.value
                  ? "border-[#c29f60] bg-[var(--sidebar-active-bg)] shadow-[0_14px_24px_rgba(194,159,96,0.08)]"
                  : "border-[var(--btn-secondary-border)] bg-[var(--subtle-bg)] hover:bg-[var(--btn-secondary-hover-bg)]"
              }`}
            >
              <p className={`text-sm font-semibold uppercase tracking-[0.18em] ${selectedLevel === level.value ? "text-[#c29f60]" : "text-[var(--foreground)]"}`}>{level.label}</p>
              <p className="mt-3 text-sm leading-7 text-[var(--library-copy-color)]">{level.helper}</p>
            </button>
          ))}
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <Button variant="ghost" className="text-[var(--btn-ghost-text)] hover:text-[var(--btn-ghost-hover-text)] hover:bg-[var(--btn-secondary-hover-bg)]" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm} disabled={loading} className="bg-[linear-gradient(135deg,#c29f60,#8a6d3b)] text-[var(--btn-primary-text,#12141a)] hover:opacity-90 transition-opacity border-none">Save to library</Button>
        </div>
      </Card>
    </div>
  );
}

