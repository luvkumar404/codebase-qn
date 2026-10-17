import { cn } from "@/lib/utils";

interface DotFieldProps {
  variant?: "center" | "corner";
  className?: string;
}

export function DotField({ variant = "center", className }: DotFieldProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 dot-grid",
        variant === "corner"
          ? "-inset-x-10 -top-10 bottom-0 dot-mask-corner"
          : "dot-mask-center",
        className
      )}
    />
  );
}
