import { BookOpen, Bot, ChartNoAxesGantt, Home, ShieldCheck, Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/workspace", label: "Topic Workspace", icon: Sparkles },
  { to: "/admin", label: "Content Moderation", icon: ShieldCheck },
  { to: "/observability", label: "Agent Runs", icon: ChartNoAxesGantt },
];

export function Sidebar() {
  return (
    <aside className="glass-panel hidden w-72 shrink-0 flex-col p-5 lg:flex">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-600">Apollo</p>
          <p className="text-sm text-slate-500">Agentic education OS</p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border bg-slate-950 p-4 text-white">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Workspace focus</p>
        <p className="mt-2 text-lg font-semibold">Search-driven technical learning</p>
        <p className="mt-2 text-sm text-slate-300">
          Curated resources, practice sets, foundational implementation work, and review tooling in one place.
        </p>
      </div>

      <nav className="space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900",
                  isActive && "bg-slate-100 text-slate-950",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <BookOpen className="h-4 w-4 text-sky-600" />
          Faculty override queue
        </div>
        <p className="mt-2 text-sm text-slate-500">7 resources need metadata review before they can move into the student catalog.</p>
      </div>
    </aside>
  );
}
