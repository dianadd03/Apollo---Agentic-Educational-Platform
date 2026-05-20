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
        tone === "default" && "bg-[var(--badge-default-bg)] text-[var(--badge-default-text)] border-[var(--badge-default-border)]",
        tone === "success" && "bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] border-[var(--badge-success-border)]",
        tone === "warning" && "bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] border-[var(--badge-warning-border)]",
        tone === "danger" && "bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)] border-[var(--badge-danger-border)]",
        tone === "info" && "bg-[var(--badge-info-bg)] text-[var(--badge-info-text)] border-[var(--badge-info-border)]",
        className,
      )}
      {...props}
    />
  );
}
