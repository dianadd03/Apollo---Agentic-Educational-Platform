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
        variant === "primary" && "bg-[linear-gradient(135deg,#c29f60,#8a6d3b)] text-[var(--btn-primary-text,#12141a)] shadow-[0_12px_24px_rgba(194,159,96,0.15)] hover:-translate-y-0.5 hover:shadow-[0_18px_28px_rgba(194,159,96,0.2)]",
        variant === "secondary" && "border border-[var(--btn-secondary-border)] bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] hover:bg-[var(--btn-secondary-hover-bg)] hover:text-[var(--btn-secondary-hover-text)] shadow-sm",
        variant === "ghost" && "text-[var(--btn-ghost-text)] hover:bg-[var(--btn-ghost-hover-bg)] hover:text-[var(--btn-ghost-hover-text)]",
        variant === "danger" && "bg-[var(--btn-danger-bg)] text-[var(--btn-danger-text)] border border-[var(--btn-danger-border)] hover:bg-[var(--btn-danger-hover-bg)]",
        className,
      )}
      {...props}
    />
  );
}
