import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-2xl border border-[#c29f60]/20 bg-[#12141a]/80 px-4 py-3 text-sm text-[#f4ead6] placeholder:text-[#dccfa6]/50 focus:border-[#c29f60]/60 focus:ring-2 focus:ring-[#c29f60]/15",
        className,
      )}
      {...props}
    />
  );
}
