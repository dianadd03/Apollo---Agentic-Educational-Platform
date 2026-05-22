import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-2xl border border-[var(--btn-secondary-border)] bg-[var(--input-bg)] text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] focus:border-[#c29f60]/60 focus:ring-2 focus:ring-[#c29f60]/15",
        className,
      )}
      {...props}
    />
  );
}
