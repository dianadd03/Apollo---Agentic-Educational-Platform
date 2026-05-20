import { BookMarked, FolderKanban, GraduationCap, LibraryBig, LogOut, UploadCloud } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { logout, user } = useAuth();
  const isStaff = user?.role === "professor" || user?.role === "admin";
  const links = [
    { to: "/library", label: "Learning Library", icon: LibraryBig },
    ...(isStaff ? [{ to: "/materials", label: "Managed Materials", icon: FolderKanban }] : []),
    ...(isStaff ? [{ to: "/materials/upload", label: "Upload Materials", icon: UploadCloud }] : []),
  ];

  return (
    <aside className="glass-panel hidden w-72 shrink-0 flex-col p-5 lg:flex">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#c29f60,#8a6d3b)] text-[#12141a] shadow-[0_10px_24px_rgba(194,159,96,0.2)]">
          <BookMarked className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#a3835b]">Apollo</p>
          <p className="text-sm text-[var(--btn-secondary-text)]">Learning platform</p>
        </div>
      </div>

      <div className="mb-6 rounded-[24px] border border-[var(--btn-secondary-border)] bg-[var(--subtle-bg)] p-5 shadow-[inset_0_1px_0_rgba(194,159,96,0.1)] text-[var(--foreground)]">
        <p className="text-xs uppercase tracking-[0.24em] text-[#a3835b]">Reader profile</p>
        <p className="mt-3 text-xl font-semibold text-[var(--foreground)]">{user?.name ?? "Learner"}</p>
        <p className="mt-2 text-sm uppercase tracking-[0.18em] text-[#c29f60]">{user?.role ?? "student"}</p>
        <p className="mt-2 text-sm leading-7 text-[var(--library-copy-color)]">
          Search topics, assign a level per topic, and keep your study collection organized like a curated academic shelf.
        </p>
      </div>

      <nav className="space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  isActive
                    ? "bg-[var(--sidebar-active-bg)] border border-[var(--sidebar-active-border)] text-[var(--sidebar-active-text)] shadow-[0_12px_24px_rgba(0,0,0,0.1)]"
                    : "text-[var(--btn-ghost-text)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--btn-secondary-hover-text)]"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[24px] border border-[var(--btn-secondary-border)] bg-[var(--subtle-bg)] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
          <GraduationCap className="h-4 w-4 text-[#c29f60]" />
          Study principle
        </div>
        <p className="mt-2 text-sm leading-7 text-[var(--library-copy-color)]">Level selection happens after topic search, so difficulty stays tied to the topic rather than the account.</p>
      </div>

      <Button variant="ghost" className="mt-4 justify-start text-[var(--btn-ghost-text)] hover:text-[var(--btn-ghost-hover-text)] hover:bg-[var(--sidebar-hover-bg)]" onClick={logout}>
        <LogOut className="mr-2 h-4 w-4" />
        Logout
      </Button>
    </aside>
  );
}
