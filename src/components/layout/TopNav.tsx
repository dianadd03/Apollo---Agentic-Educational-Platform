import { BellDot, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";

type TopNavProps = {
  title?: string;
  subtitle?: string;
  role?: string;
};

export function TopNav({ title = "Apollo", subtitle = "Learning library", role }: TopNavProps) {
  const { user } = useAuth();

  return (
    <header className="glass-panel flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm text-[#a3835b]">{subtitle}</p>
        <h1 className="text-[2.2rem] font-semibold tracking-tight text-[#f4ead6]">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-2xl border border-[#c29f60]/20 bg-[#12141a]/60 px-4 py-3 text-sm text-[#dccfa6]/70 md:flex">
          <Search className="h-4 w-4" />
          Topic-focused study workspace
        </div>
        <button className="rounded-2xl border border-[#c29f60]/20 bg-[#12141a]/60 p-3 text-[#dccfa6]/70 transition hover:bg-[#1a1c23] hover:text-[#f4ead6] shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
          <BellDot className="h-4 w-4" />
        </button>
        <Badge tone="info" className="bg-[#2c221d] text-[#f4ead6] border-[#4e232e]">{user?.name ?? role ?? "Learner"}</Badge>
      </div>
    </header>
  );
}

