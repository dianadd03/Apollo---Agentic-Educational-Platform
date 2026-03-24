import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";

type AppShellProps = {
  children: ReactNode;
  role: string;
};

export function AppShell({ children, role }: AppShellProps) {
  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto flex max-w-[1600px] gap-6">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <TopNav role={role} />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
