import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition duration-300 focus-visible:ring-2 focus-visible:ring-primary/35 disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" && "bg-[linear-gradient(135deg,#c29f60,#8a6d3b)] text-[#12141a] shadow-[0_12px_24px_rgba(194,159,96,0.15)] hover:-translate-y-0.5 hover:shadow-[0_18px_28px_rgba(194,159,96,0.2)]",
        variant === "secondary" && "border border-[#c29f60]/20 bg-[#161820] text-[#dccfa6] hover:bg-[#1c1e26] hover:text-[#f4ead6] shadow-sm",
        variant === "ghost" && "text-[#dccfa6]/80 hover:bg-[#1c1e26]/70 hover:text-[#f4ead6]",
        variant === "danger" && "bg-[#4e1c24] text-[#dccfa6] border border-[#2a0e12] hover:bg-[#6c2833]",
        className,
      )}
      {...props}
    />
  );
}
