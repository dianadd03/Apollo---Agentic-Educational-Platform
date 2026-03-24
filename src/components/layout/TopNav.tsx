import { Bell, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

type TopNavProps = {
  role: string;
};

export function TopNav({ role }: TopNavProps) {
  return (
    <header className="glass-panel flex items-center justify-between gap-4 p-4">
      <div>
        <p className="text-sm text-slate-500">Apollo workspace</p>
        <h1 className="text-xl font-semibold tracking-tight text-slate-950">Agentic educational platform</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-500 md:flex">
          <Search className="h-4 w-4" />
          Search command palette
        </div>
        <button className="rounded-xl border bg-white p-2.5 text-slate-500 transition hover:bg-slate-50">
          <Bell className="h-4 w-4" />
        </button>
        <Badge tone="info">{role}</Badge>
        <Link
          to="/auth"
          className="rounded-xl border bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Switch account
        </Link>
      </div>
    </header>
  );
}
