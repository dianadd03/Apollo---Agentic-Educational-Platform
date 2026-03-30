import { BookMarked, GraduationCap, LibraryBig, LogOut } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [{ to: "/library", label: "Learning Library", icon: LibraryBig }];

export function Sidebar() {
  const { logout, user } = useAuth();

  return (
    <aside className="glass-panel hidden w-72 shrink-0 flex-col p-5 lg:flex">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#c29f60,#8a6d3b)] text-[#12141a] shadow-[0_10px_24px_rgba(194,159,96,0.2)]">
          <BookMarked className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#a3835b]">Apollo</p>
          <p className="text-sm text-[#dccfa6]">Learning platform</p>
        </div>
      </div>

      <div className="mb-6 rounded-[24px] border border-[#c29f60]/20 bg-[linear-gradient(180deg,#1c1e26,#15171e)] p-5 shadow-[inset_0_1px_0_rgba(194,159,96,0.1)] text-[#f4ead6]">
        <p className="text-xs uppercase tracking-[0.24em] text-[#a3835b]">Reader profile</p>
        <p className="mt-3 text-xl font-semibold text-[#f4ead6]">{user?.name ?? "Learner"}</p>
        <p className="mt-2 text-sm leading-7 text-[#dccfa6]/80">
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
                    ? "bg-[#2c221d] border border-[#c29f60]/20 text-[#f4ead6] shadow-[0_12px_24px_rgba(0,0,0,0.3)]"
                    : "text-[#dccfa6]/70 hover:bg-[#1c1e26] hover:text-[#f4ead6]"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[24px] border border-[#c29f60]/20 bg-[linear-gradient(180deg,#1a1c23,#12141a)] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#f4ead6]">
          <GraduationCap className="h-4 w-4 text-[#c29f60]" />
          Study principle
        </div>
        <p className="mt-2 text-sm leading-7 text-[#dccfa6]/70">Level selection happens after topic search, so difficulty stays tied to the topic rather than the account.</p>
      </div>

      <Button variant="ghost" className="mt-4 justify-start text-[#dccfa6] hover:text-[#f4ead6] hover:bg-[#1c1e26]" onClick={logout}>
        <LogOut className="mr-2 h-4 w-4" />
        Logout
      </Button>
    </aside>
  );
}

