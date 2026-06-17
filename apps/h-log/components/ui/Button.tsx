import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

const baseClasses =
  "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 sm:w-auto";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-blue-300/30 bg-blue-500 text-white shadow-none hover:bg-blue-400 sm:shadow-[0_18px_48px_rgb(79_140_255_/_0.25)]",
  secondary:
    "border border-slate-600/80 bg-slate-900/30 text-slate-100 hover:border-cyan-300/50 hover:bg-slate-800/80",
  ghost: "text-slate-300 hover:bg-slate-800/70 hover:text-white",
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
