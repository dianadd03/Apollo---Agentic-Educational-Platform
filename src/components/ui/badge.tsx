import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "success" | "warning" | "danger" | "info";
};

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] border",
        tone === "default" && "bg-[#1c1e26] text-[#dccfa6] border-[#c29f60]/20",
        tone === "success" && "bg-[#121e14] text-[#8fa68a] border-[#243b29]/40",
        tone === "warning" && "bg-[#2c221d] text-[#c29f60] border-[#4e232e]/40",
        tone === "danger" && "bg-[#2a0e12] text-[#c26060] border-[#4e1c24]/40",
        tone === "info" && "bg-[#1c2e4a] text-[#8fa6c2] border-[#2c3e57]/40",
        className,
      )}
      {...props}
    />
  );
}
