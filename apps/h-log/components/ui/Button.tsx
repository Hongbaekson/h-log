import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

const baseClasses =
  "inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-300 sm:w-auto";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-[#5865f2] text-white hover:bg-[#4752c4]",
  secondary:
    "border border-white/15 bg-white/5 text-slate-100 hover:border-white/30 hover:bg-white/10",
  ghost: "text-slate-300 hover:bg-white/5 hover:text-white",
};

type ButtonLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  variant?: ButtonVariant;
};

export function ButtonLink({
  className = "",
  variant = "primary",
  ...props
}: ButtonLinkProps) {
  return <Link className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props} />;
}
