import { Moon, Search, Sun } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSearch } from "@/context/SearchContext";
import { useTheme } from "@/context/ThemeContext";
import { Badge } from "@/components/ui/badge";

type TopNavProps = {
  title?: string;
  subtitle?: string;
  role?: string;
};

export function TopNav({ title = "Apollo", subtitle = "Learning library", role }: TopNavProps) {
  const { user } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <header className="glass-panel flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm text-[#a3835b]">{subtitle}</p>
        <h1 className="text-[2.2rem] font-semibold tracking-tight text-[var(--section-title-color)]">{title}</h1>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex w-full min-w-0 items-center gap-2 rounded-2xl border border-[var(--btn-secondary-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--input-text)] shadow-[inset_0_1px_4px_rgba(0,0,0,0.15)] sm:min-w-[280px]">
          <Search className="h-4 w-4 shrink-0 text-[#a3835b]" />
          <input
            type="search"
            value={searchQuery}
            aria-label="Search saved topics"
            placeholder="Filter topics"
            onChange={(event) => setSearchQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--input-text)] placeholder:text-[var(--input-placeholder)]"
          />
        </label>
        <button
          type="button"
          aria-label={`Switch to ${nextTheme} theme`}
          title={`Switch to ${nextTheme} theme`}
          onClick={toggleTheme}
          className="rounded-2xl border border-[var(--btn-secondary-border)] bg-[var(--btn-secondary-bg)] p-3 text-[var(--btn-secondary-text)] shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition hover:bg-[var(--btn-secondary-hover-bg)] hover:text-[var(--btn-secondary-hover-text)]"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <Badge tone="info">{user?.name ?? role ?? "Learner"}</Badge>
      </div>
    </header>
  );
}

