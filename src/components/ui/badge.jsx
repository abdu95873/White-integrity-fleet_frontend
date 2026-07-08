import { cn } from "@/lib/utils";

export function Badge({ className, variant = "default", ...props }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variant === "default" && "border-transparent bg-primary text-primary-foreground",
        variant === "secondary" && "border-transparent bg-secondary text-secondary-foreground",
        variant === "success" && "border-transparent bg-emerald-100 text-emerald-800",
        variant === "warning" && "border-transparent bg-amber-100 text-amber-800",
        className
      )}
      {...props}
    />
  );
}
