import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";

type AppShellProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  role?: string;
};

export function AppShell({ children, title = "Apollo Library", subtitle = "Digital study shelf", role }: AppShellProps) {
  return (
    <div className="library-shell px-4 py-5 md:px-6 md:py-6">
      <div className="mx-auto flex max-w-[1600px] gap-6">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <TopNav title={title} subtitle={subtitle} role={role} />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
